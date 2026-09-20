import Foundation
import CoreLocation
import Capacitor

@objc(NativeLocationPlugin)
public class NativeLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "NativeLocationPlugin"
    public let jsName = "NativeLocation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCurrentPosition", returnType: CAPPluginReturnPromise)
    ]

    private var locationManager: CLLocationManager?
    private var pendingCall: CAPPluginCall?
    private var timeoutTimer: Timer?

    @objc func getCurrentPosition(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pendingCall == nil else {
                call.reject("A location request is already in progress.", "LOCATION_BUSY")
                return
            }

            let manager = self.locationManager ?? CLLocationManager()
            self.locationManager = manager
            manager.delegate = self
            manager.desiredAccuracy = kCLLocationAccuracyBest

            self.pendingCall = call
            let requestedTimeout = call.getInt("timeout") ?? 10000
            let timeoutMs = max(2000, min(requestedTimeout, 30000))
            self.timeoutTimer?.invalidate()
            self.timeoutTimer = Timer.scheduledTimer(
                withTimeInterval: Double(timeoutMs) / 1000.0,
                repeats: false
            ) { [weak self] _ in
                self?.rejectPending(
                    message: "Location request timed out.",
                    code: "LOCATION_TIMEOUT"
                )
            }

            self.continueLocationRequest(manager)
        }
    }

    private func continueLocationRequest(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            rejectPending(
                message: "Location permission is denied.",
                code: "LOCATION_DENIED"
            )
        @unknown default:
            rejectPending(
                message: "Location permission state is unavailable.",
                code: "LOCATION_UNAVAILABLE"
            )
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard pendingCall != nil else { return }

        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            rejectPending(
                message: "Location permission is denied.",
                code: "LOCATION_DENIED"
            )
        case .notDetermined:
            break
        @unknown default:
            rejectPending(
                message: "Location permission state is unavailable.",
                code: "LOCATION_UNAVAILABLE"
            )
        }
    }

    public func locationManager(
        _ manager: CLLocationManager,
        didUpdateLocations locations: [CLLocation]
    ) {
        guard
            let location = locations
                .filter({ $0.horizontalAccuracy >= 0 })
                .min(by: { $0.horizontalAccuracy < $1.horizontalAccuracy })
        else {
            rejectPending(
                message: "No valid location fix was returned.",
                code: "LOCATION_UNAVAILABLE"
            )
            return
        }

        let call = pendingCall
        clearPendingState()
        call?.resolve([
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "timestamp": location.timestamp.timeIntervalSince1970 * 1000.0
        ])
    }

    public func locationManager(
        _ manager: CLLocationManager,
        didFailWithError error: Error
    ) {
        let nsError = error as NSError
        let code = nsError.code == CLError.denied.rawValue
            ? "LOCATION_DENIED"
            : "LOCATION_UNAVAILABLE"
        rejectPending(message: error.localizedDescription, code: code)
    }

    private func rejectPending(message: String, code: String) {
        guard let call = pendingCall else { return }
        clearPendingState()
        call.reject(message, code)
    }

    private func clearPendingState() {
        timeoutTimer?.invalidate()
        timeoutTimer = nil
        pendingCall = nil
    }
}
