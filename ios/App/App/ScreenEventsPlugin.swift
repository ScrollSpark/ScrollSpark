import Foundation
import UIKit
import Capacitor

/**
 * Approximates screen lock / unlock using protected-data notifications (no public screen-off API for WebView apps).
 * Emits the same `screenStateChange` events as Android: `{ state: "off" | "on" }`.
 */
@objc(ScreenEventsPlugin)
public class ScreenEventsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenEventsPlugin"
    public let jsName = "ScreenEvents"
    public let pluginMethods: [CAPPluginMethod] = []

    private var observers: [NSObjectProtocol] = []

    override public func load() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: UIApplication.protectedDataWillBecomeUnavailableNotification, object: nil, queue: OperationQueue.main) { [weak self] _ in
            self?.notifyListeners("screenStateChange", data: ["state": "off"])
        })
        observers.append(center.addObserver(forName: UIApplication.protectedDataDidBecomeAvailableNotification, object: nil, queue: OperationQueue.main) { [weak self] _ in
            self?.notifyListeners("screenStateChange", data: ["state": "on"])
        })
    }

    deinit {
        for observer in observers {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}
