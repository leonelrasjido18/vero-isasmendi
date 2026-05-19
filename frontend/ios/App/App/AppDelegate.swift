import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.

        // ── Anti-screenshot protection ──────────────────────────────────
        // Uses the secure text field technique to make screenshots appear black.
        DispatchQueue.main.async {
            self.preventScreenCapture()
        }

        // Listen for screenshot notifications to show an alert
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(didTakeScreenshot),
            name: UIApplication.userDidTakeScreenshotNotification,
            object: nil
        )

        return true
    }

    // ── Secure text field overlay technique ────────────────────────────
    // This creates an invisible secure text field over the window.
    // iOS automatically blacks out secure text fields in screenshots
    // and screen recordings, which covers the entire app window.
    private func preventScreenCapture() {
        guard let window = self.window else { return }

        let field = UITextField()
        field.isSecureTextEntry = true
        field.isUserInteractionEnabled = false

        // Add the secure field's layer to the window
        // This makes the entire window "secure" — screenshots will be black
        guard let secureSublayer = field.layer.sublayers?.first else { return }

        secureSublayer.frame = window.bounds
        secureSublayer.autoresizingMask = [.layerWidthSizable, .layerHeightSizable]
        window.layer.superlayer?.addSublayer(secureSublayer)
    }

    // ── Screenshot notification ────────────────────────────────────────
    @objc private func didTakeScreenshot() {
        // Optional: show alert when screenshot is detected
        if let rootVC = window?.rootViewController {
            let alert = UIAlertController(
                title: "Captura detectada",
                message: "Las capturas de pantalla están deshabilitadas en esta app.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "Entendido", style: .default))
            rootVC.present(alert, animated: true)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
