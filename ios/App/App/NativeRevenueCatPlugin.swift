import Foundation
import UIKit
import Capacitor
import RevenueCat
import RevenueCatUI
import SwiftUI

/// Keeps the presentation controller delegate alive until the sheet is dismissed.
private final class AdaptiveSheetDismissDelegate: NSObject, UIAdaptivePresentationControllerDelegate {
    private let onDismiss: () -> Void

    init(onDismiss: @escaping () -> Void) {
        self.onDismiss = onDismiss
        super.init()
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        onDismiss()
    }
}

@objc(NativeRevenueCatPlugin)
public class NativeRevenueCatPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeRevenueCatPlugin"
    public let jsName = "NativeRevenueCat"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getOfferings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCustomerInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAppUserId", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentPaywall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentCustomerCenter", returnType: CAPPluginReturnPromise)
    ]

    private var paywallSheetDelegate: AdaptiveSheetDismissDelegate?
    private var customerCenterSheetDelegate: AdaptiveSheetDismissDelegate?

    private func customerInfoObject(_ info: CustomerInfo) -> JSObject {
        var activeEnts: JSObject = [:]
        var allEnts: JSObject = [:]
        let iso = ISO8601DateFormatter()
        for (key, ent) in info.entitlements.all {
            var row: JSObject = [
                "identifier": ent.identifier,
                "isActive": ent.isActive,
                "willRenew": ent.willRenew,
                "periodType": String(describing: ent.periodType)
            ]
            if let exp = ent.expirationDate {
                row["expirationDate"] = iso.string(from: exp)
            }
            allEnts[key] = row
            if ent.isActive {
                activeEnts[key] = row
            }
        }
        return [
            "entitlements": [
                "active": activeEnts,
                "all": allEnts
            ],
            "activeSubscriptions": Array(info.activeSubscriptions),
            "originalAppUserId": info.originalAppUserId
        ]
    }

    private func packageTypeString(_ packageType: PackageType) -> String {
        switch packageType {
        case .monthly: return "MONTHLY"
        case .annual: return "ANNUAL"
        default: return String(describing: packageType)
        }
    }

    private func packageObject(_ p: Package) -> JSObject {
        let sp = p.storeProduct
        var product: JSObject = [
            "identifier": sp.productIdentifier,
            "priceString": sp.localizedPriceString,
            "description": sp.localizedDescription
        ]
        product["price"] = NSDecimalNumber(decimal: sp.price)
        return [
            "identifier": p.identifier,
            "packageType": packageTypeString(p.packageType),
            "product": product
        ]
    }

    private func isUserCancelledPurchase(_ error: Error) -> Bool {
        if let code = error as? ErrorCode {
            return code == .purchaseCancelledError
        }
        let ns = error as NSError
        if let underlying = ns.userInfo[NSUnderlyingErrorKey] as? Error {
            return isUserCancelledPurchase(underlying)
        }
        return false
    }

    @objc func getOfferings(_ call: CAPPluginCall) {
        Task {
            do {
                let offerings = try await Purchases.shared.offerings()
                guard let current = offerings.current else {
                    call.resolve(["offerings": JSObject()])
                    return
                }
                let packages = current.availablePackages.map { self.packageObject($0) }
                let currentObj: JSObject = [
                    "identifier": current.identifier,
                    "availablePackages": packages
                ]
                call.resolve(["offerings": ["current": currentObj]])
            } catch {
                call.reject("getOfferings failed", error.localizedDescription, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("Missing productId")
            return
        }
        Task {
            do {
                let offerings = try await Purchases.shared.offerings()
                guard let current = offerings.current else {
                    call.reject("No current offering")
                    return
                }
                guard let pkg = current.availablePackages.first(where: { $0.storeProduct.productIdentifier == productId }) else {
                    call.reject("No package for product \(productId)")
                    return
                }
                let (_, customerInfo, _) = try await Purchases.shared.purchase(package: pkg)
                call.resolve(["customerInfo": self.customerInfoObject(customerInfo)])
            } catch {
                if self.isUserCancelledPurchase(error) {
                    call.reject("Purchase cancelled", "USER_CANCELLED", error)
                    return
                }
                call.reject("Purchase failed", error.localizedDescription, error)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                let customerInfo = try await Purchases.shared.restorePurchases()
                call.resolve(["customerInfo": self.customerInfoObject(customerInfo)])
            } catch {
                call.reject("Restore failed", error.localizedDescription, error)
            }
        }
    }

    @objc func getCustomerInfo(_ call: CAPPluginCall) {
        Task {
            do {
                let customerInfo = try await Purchases.shared.customerInfo()
                call.resolve(["customerInfo": self.customerInfoObject(customerInfo)])
            } catch {
                call.reject("getCustomerInfo failed", error.localizedDescription, error)
            }
        }
    }

    @objc func setAppUserId(_ call: CAPPluginCall) {
        let appUserId = call.getString("appUserId")
        Task {
            do {
                if let id = appUserId, !id.isEmpty {
                    _ = try await Purchases.shared.logIn(id)
                } else {
                    _ = try await Purchases.shared.logOut()
                }
                call.resolve()
            } catch {
                call.reject("setAppUserId failed", error.localizedDescription, error)
            }
        }
    }

    @objc func presentPaywall(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let bridge = self.bridge, let root = bridge.viewController else {
                call.reject("No root view controller")
                return
            }
            var didFinish = false
            let finish: () -> Void = {
                guard !didFinish else { return }
                didFinish = true
                self.paywallSheetDelegate = nil
                call.resolve()
            }
            let delegate = AdaptiveSheetDismissDelegate(onDismiss: finish)
            self.paywallSheetDelegate = delegate

            let host = UIHostingController(rootView: PaywallView())
            host.modalPresentationStyle = .pageSheet
            if let sheet = host.sheetPresentationController {
                sheet.detents = [.large()]
            }
            root.present(host, animated: true) {
                host.presentationController?.delegate = delegate
            }
        }
    }

    @objc func presentCustomerCenter(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            DispatchQueue.main.async { [weak self] in
                guard let self, let bridge = self.bridge, let root = bridge.viewController else {
                    call.reject("No root view controller")
                    return
                }
                var didFinish = false
                let finish: () -> Void = {
                    guard !didFinish else { return }
                    didFinish = true
                    self.customerCenterSheetDelegate = nil
                    call.resolve()
                }
                let delegate = AdaptiveSheetDismissDelegate(onDismiss: finish)
                self.customerCenterSheetDelegate = delegate

                let host = UIHostingController(rootView: CustomerCenterView())
                host.modalPresentationStyle = .pageSheet
                if let sheet = host.sheetPresentationController {
                    sheet.detents = [.large()]
                }
                root.present(host, animated: true) {
                    host.presentationController?.delegate = delegate
                }
            }
        } else {
            call.reject("Requires iOS 15+")
        }
    }
}
