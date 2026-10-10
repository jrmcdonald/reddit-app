import XCTest

/// Walks Perch's main screens against the fake Reddit (`e2e/server`), saving
/// a screenshot of each and running Apple's accessibility audit on it. CI
/// runs this twice: at the default text size, and at the largest
/// accessibility size, where clipped text shows up.
///
/// Settings come from the environment, passed by xcodebuild with a
/// `TEST_RUNNER_` prefix:
///   APP_BUNDLE_ID  the installed Perch build to drive
///   OUTPUT_DIR     where screenshots and `audit.tsv` go (a path on the Mac)
///   SERVER_URL     the fake server, default https://localhost:8443 (the
///                  build itself points at it; this is only for the log)
final class WalkthroughTests: XCTestCase {
  /// The fixture client ID in `e2e/server/fixtures.ts`. Made up, like all of it.
  private let clientId = "perchwalkthrough01"

  private var app: XCUIApplication!
  private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
  private var outputDir: URL!
  private var serverURL = "https://localhost:8443"
  private var findings: [String] = []

  private struct MissingSetting: Error, CustomStringConvertible {
    let name: String
    var description: String { "Set TEST_RUNNER_\(name) for the walkthrough" }
  }

  override func setUpWithError() throws {
    // A screen that does not appear makes every later step meaningless.
    continueAfterFailure = false
    let env = ProcessInfo.processInfo.environment
    guard let bundleId = env["APP_BUNDLE_ID"] else { throw MissingSetting(name: "APP_BUNDLE_ID") }
    guard let output = env["OUTPUT_DIR"] else { throw MissingSetting(name: "OUTPUT_DIR") }
    if let url = env["SERVER_URL"], !url.isEmpty { serverURL = url }
    app = XCUIApplication(bundleIdentifier: bundleId)
    app.launchEnvironment["TZ"] = "UTC"
    outputDir = URL(fileURLWithPath: output, isDirectory: true)
    try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)
    try "screen\ttype\tissue\telement\tframe\n"
      .write(to: auditFile, atomically: true, encoding: .utf8)
  }

  /// Not a check: walkthrough.sh runs this alone before the walkthrough, so
  /// the runner's slow first XCUITest session is spent on it, and ignores
  /// how it ends.
  func testLaunch() throws {
    app.launch()
    _ = app.wait(for: .runningForeground, timeout: 30)
    app.terminate()
  }

  func testWalkthrough() throws {
    app.launch()
    signIn()

    // Home, in each of its views. The pinned post comes first in the list.
    let pinned = button(startingWith: "Pinned: share your kitchen")
    wait(for: pinned, "Home")
    capture("home")
    // Only cards have a Share button.
    go(app.buttons["Cards"], to: app.buttons["Share"].firstMatch, "Home as cards")
    capture("home-cards")
    go(app.buttons["Grid"], to: app.buttons["Show NSFW media"], "Home as a grid")
    capture("home-grid")
    go(app.buttons["List"], to: pinned, "Home as a list again")

    // The swiper, from the first picture in Home.
    go(app.buttons["Swiper"], to: app.buttons["Close"], "Swiper")
    wait(for: element(startingWith: "Home, 1 of"), "Swiper's position")
    capture("swiper")
    go(app.buttons["Close"], to: pinned, "Home, after the swiper")

    // A text post and its comments, then the replies behind "load more".
    let loadMore = app.buttons["Load 2 more replies"]
    go(button(startingWith: "How did medieval sailors"), to: loadMore, "Post")
    capture("post")
    go(loadMore, to: button(startingWith: "saga_reader"), "More replies")
    capture("post-replies")
    // Home is left scrolled to that post at the largest text size, and the
    // list unloads rows out of sight, the pinned one included; its header's
    // sort button stays.
    back(to: app.buttons["Sort: Best"], "Home, after the post")

    // Saved: posts, then comments.
    go(app.tabBars.buttons["Saved"], to: button(startingWith: "Fog rolling over the ridge"), "Saved")
    capture("saved")
    go(element(startingWith: "Comments, 2 of 2"), to: button(startingWith: "Comment by hanseatic_ledger"), "Saved comments")
    capture("saved-comments")

    // Browse: subscriptions, then a subreddit.
    go(app.tabBars.buttons["Browse"], to: button(startingWith: "r/FogAndFells"), "Browse")
    capture("browse")
    go(button(startingWith: "r/FogAndFells"), to: button(startingWith: "Cloud inversion"), "Subreddit")
    capture("subreddit")
    back(to: button(startingWith: "r/FogAndFells"), "Browse, again")

    // Popular, with a spoiler covered further down. Its first post, since
    // at the largest text size the spoiler is out of sight and not loaded.
    go(app.tabBars.buttons["Popular"], to: button(startingWith: "Fog rolling over the ridge"), "Popular")
    capture("popular")

    go(app.tabBars.buttons["Settings"], to: button(startingWith: "Browse anonymously"), "Settings")
    capture("settings")

    // Anonymous mode: no Home or Saved, and a badge on Popular.
    // Switching modes starts the app's screens afresh; Popular is where the
    // badge is, whichever tab that leaves open.
    tap(button(startingWith: "Browse anonymously"))
    go(app.tabBars.buttons["Popular"], to: element(startingWith: "Browsing anonymously"), "Anonymous mode")
    capture("anonymous")

    // Dark mode, chosen in Settings.
    go(app.tabBars.buttons["Settings"], to: element(startingWith: "Dark, 3 of 3"), "Settings, anonymous")
    tap(element(startingWith: "Dark, 3 of 3"))
    capture("settings-dark")
    go(app.tabBars.buttons["Popular"], to: element(startingWith: "Browsing anonymously"), "Popular, dark")
    capture("anonymous-dark")

    if !findings.isEmpty {
      XCTFail("The accessibility audit found \(findings.count) issues; see audit.tsv")
    }
  }

  // MARK: - Steps

  /// The first-run screen: the client ID, then Reddit's sign-in, which the
  /// fake answers at once with a redirect back to the app. CI erases the
  /// simulator before each run, so it always starts here.
  private func signIn() {
    let field = app.textFields["Reddit app client ID"]
    let tabs = app.tabBars.firstMatch
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline, !field.exists, !tabs.exists {
      Thread.sleep(forTimeInterval: 0.25)
    }
    if tabs.exists { return }
    if !field.exists {
      diagnose("The app did not start")
      XCTFail("The app did not start: neither the first-run screen nor the tabs appeared")
      return
    }
    capture("welcome")

    type(clientId, into: field)
    tap(app.buttons["Sign in with Reddit"])
    // The sign-in sheet opens and closes by itself against the fake; iOS
    // may still ask to allow it, which dismissSystemSheets answers.
    let signedIn = Date().addingTimeInterval(60)
    while Date() < signedIn, !tabs.exists {
      dismissSystemSheets()
      Thread.sleep(forTimeInterval: 0.5)
    }
    if !tabs.exists {
      diagnose("Signing in did not finish")
      XCTFail("Signing in did not finish")
    }
  }

  /// Sheets iOS shows on a fresh simulator that cover the app: the offer to
  /// save the password after signing in, and the keyboard's first-use tip.
  @discardableResult
  private func dismissSystemSheets() -> Bool {
    var dismissed = false
    for owner in [app!, springboard] {
      for label in ["Not Now", "Continue"] {
        let button = owner.buttons[label]
        if button.exists, button.isHittable {
          button.tap()
          dismissed = true
        }
      }
    }
    return dismissed
  }

  /// When a step fails: what was on screen, as a screenshot and as the
  /// accessibility tree of the app and of the system UI over it, in the log.
  private func diagnose(_ what: String) {
    let dir = outputDir.appendingPathComponent("failure", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    try? XCUIScreen.main.screenshot().pngRepresentation
      .write(to: dir.appendingPathComponent("failure.png"))
    print("DIAGNOSE-BEGIN \(what)")
    print(app.debugDescription)
    print("--- SpringBoard ---")
    print(springboard.debugDescription)
    print("DIAGNOSE-END")
  }

  /// A screenshot for comparison, then the audit of the same screen.
  private func capture(_ name: String) {
    // On a slow runner the offer to save the password can come later than
    // signIn waits for it, over whatever screen is next.
    dismissSystemSheets()
    // No screenshot is of a keyboard. On a slow runner one has been found
    // open over Server and login, the form scrolled to make room for it.
    // Return closes it, as in type().
    if app.keyboards.firstMatch.exists {
      // Said in the log, with what had focus: what opens it is not known yet.
      let focused = app.descendants(matching: .any)
        .matching(NSPredicate(format: "hasKeyboardFocus == true")).firstMatch
      let what = focused.exists ? "\(focused.elementType.rawValue) '\(focused.label)'" : "nothing"
      print("CAPTURE\t\(name)\ta keyboard was open; focus on \(what)")
      app.typeText("\n")
      if !app.keyboards.firstMatch.waitForNonExistence(timeout: 5) {
        print("CAPTURE\t\(name)\tthe keyboard stayed open")
      }
    }
    let shot = settledScreenshot()
    do {
      try shot.pngRepresentation.write(to: outputDir.appendingPathComponent("\(name).png"))
    } catch {
      XCTFail("Could not save the \(name) screenshot: \(error)")
    }
    let attachment = XCTAttachment(screenshot: shot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    audit(name)
  }

  /// The screen once it stops changing: card images load, and lists settle
  /// after scrolling, in their own time. A fixed second once caught the card
  /// screen before its image arrived. First any spinner goes, then three
  /// identical frames a second apart count as settled: with two, Home (the
  /// first screen to load images on a freshly erased simulator) was once
  /// taken with its card frames still empty, the images served but not yet
  /// drawn. A screen that never settles (a blinking cursor) is taken after
  /// ten seconds. A system sheet that slides in meanwhile is dismissed, and
  /// the settling starts again. Few frames: screenshots are slow on a busy
  /// runner, and XCUITest has timed out asking for one.
  private func settledScreenshot() -> XCUIScreenshot {
    let spinning = app.activityIndicators.firstMatch
    if spinning.exists { _ = spinning.waitForNonExistence(timeout: 10) }
    Thread.sleep(forTimeInterval: 1.0)
    var shot = XCUIScreen.main.screenshot()
    var unchanged = 0
    let deadline = Date().addingTimeInterval(10)
    while Date() < deadline {
      Thread.sleep(forTimeInterval: 1.0)
      if dismissSystemSheets() {
        Thread.sleep(forTimeInterval: 1.0)
        shot = XCUIScreen.main.screenshot()
        unchanged = 0
        continue
      }
      let next = XCUIScreen.main.screenshot()
      if next.pngRepresentation == shot.pngRepresentation {
        unchanged += 1
        if unchanged == 2 { return next }
      } else {
        unchanged = 0
      }
      shot = next
    }
    return shot
  }

  /// Apple's audit: contrast, hit regions, labels, traits, Dynamic Type,
  /// clipped text. Issues are collected rather than failing at once, so one
  /// run lists them all.
  private func audit(_ screen: String) {
    // Element detection works from the screen image, and text caught mid
    // fade or mid layout can trip it once. A screen with issues is audited
    // again after settling, and only issues found both times are recorded.
    let first = auditPass(screen)
    guard !first.isEmpty else { return }
    // The issues that came and went were text found in the screen's pixels
    // with no element, on screens of card images. Settled, not a fixed wait.
    _ = settledScreenshot()
    // Compared without the frame: a reproducible issue on an element that
    // moved by a point between passes is still the same issue.
    let seen = Set(first.map { $0.dropLast().joined(separator: "\t") })
    let second = auditPass(screen)
    for issue in second where seen.contains(issue.dropLast().joined(separator: "\t")) {
      record(issue)
    }
  }

  private func auditPass(_ screen: String) -> [[String]] {
    var issues: [[String]] = []
    do {
      try app.performAccessibilityAudit(for: .all) { issue in
        let element = issue.element
        let label = [element?.label, element?.identifier]
          .compactMap { $0 }
          .first { !$0.isEmpty } ?? "(no label)"
        let frame = element.map { String(describing: $0.frame) } ?? ""
        issues.append([screen, Self.name(of: issue.auditType), issue.compactDescription, label, frame])
        return true
      }
    } catch {
      issues.append([screen, "error", "\(error)", "", ""])
    }
    return issues
  }


  /// Writes a finding out at once: a step that fails later ends the test
  /// there, and what was found up to then should not be lost with it.
  private func record(_ fields: [String]) {
    let line = fields
      .map { $0.replacingOccurrences(of: "\t", with: " ").replacingOccurrences(of: "\n", with: " ") }
      .joined(separator: "\t")
    findings.append(line)
    print("AUDIT\t\(line)")
    if let handle = try? FileHandle(forWritingTo: auditFile) {
      handle.seekToEndOfFile()
      handle.write(Data((line + "\n").utf8))
      try? handle.close()
    }
  }

  private var auditFile: URL { outputDir.appendingPathComponent("audit.tsv") }

  private static func name(of type: XCUIAccessibilityAuditType) -> String {
    let names: [(XCUIAccessibilityAuditType, String)] = [
      (.contrast, "contrast"),
      (.elementDetection, "elementDetection"),
      (.hitRegion, "hitRegion"),
      (.sufficientElementDescription, "sufficientElementDescription"),
      (.dynamicType, "dynamicType"),
      (.textClipped, "textClipped"),
      (.trait, "trait"),
    ]
    let matched = names.filter { type.contains($0.0) }.map(\.1)
    return matched.isEmpty ? "other(\(type.rawValue))" : matched.joined(separator: "+")
  }

  // MARK: - Finding and using elements

  private func button(startingWith prefix: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
  }

  private func element(startingWith prefix: String) -> XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label BEGINSWITH %@", prefix))
      .firstMatch
  }

  /// Waits for an element, clearing any system sheet that comes up over the
  /// app meanwhile: iOS's offer to save the password has arrived over Home
  /// a minute after signing in.
  private func wait(for element: XCUIElement, _ what: String, timeout: TimeInterval = 20) {
    let deadline = Date().addingTimeInterval(timeout)
    while !element.waitForExistence(timeout: 1), Date() < deadline {
      dismissSystemSheets()
    }
    if !element.exists {
      diagnose("\(what) did not appear")
      XCTFail("\(what) did not appear")
    }
  }

  /// Taps, and waits for what the tap should show. A tap can go nowhere: a
  /// system sheet that came up as it was tapped takes it, and a list still
  /// laying out can move its row from under it. So when nothing has
  /// happened after five seconds (a sheet was in the way, or the screen's
  /// navigation bars are as they were) and the target is still there, it is
  /// tapped once more.
  private func go(_ target: XCUIElement, to expected: XCUIElement, _ what: String) {
    let bars = { self.app.navigationBars.allElementsBoundByIndex.map(\.identifier) }
    let before = bars()
    tap(target)
    if !expected.waitForExistence(timeout: 5) {
      let sheet = dismissSystemSheets()
      if !expected.exists, target.exists, sheet || bars() == before {
        tap(target)
      }
    }
    wait(for: expected, what)
  }

  /// Taps, scrolling first when the element is below the fold, as it often
  /// is at the largest text sizes: a post's later comments can be four
  /// screens down there.
  private func tap(_ element: XCUIElement) {
    if !element.waitForExistence(timeout: 20) {
      diagnose("\(element) did not appear")
      XCTFail("\(element) did not appear")
      return
    }
    dismissSystemSheets()
    var swipes = 0
    while !element.isHittable, swipes < 15 {
      dismissSystemSheets()
      app.swipeUp(velocity: .slow)
      swipes += 1
    }
    if !element.isHittable {
      diagnose("\(element) is not hittable")
      XCTFail("\(element) is not hittable")
      return
    }
    element.tap()
  }

  /// Types into a field and checks it took. On a fresh simulator the first
  /// characters can be lost while the keyboard is still appearing (one run
  /// typed "halhost:8443" for "https://localhost:8443"), so it waits for the
  /// field's focus and the keyboard, and retypes a character at a time if the value is wrong. A
  /// secure field's value cannot be read back; it is typed slowly from the
  /// start, as is anything asked to be.
  private func type(_ text: String, into field: XCUIElement, slowly: Bool = false) {
    let secure = field.elementType == .secureTextField
    for attempt in 1...3 {
      focus(field)
      _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
      clear(field)
      var typed = true
      if attempt == 1 && !secure && !slowly {
        field.typeText(text)
      } else {
        for character in text {
          // A field has lost its focus partway through on a slow runner (one
          // run's password stopped after a few characters), and typing
          // without focus fails the walkthrough outright: start again.
          guard hasFocus(field) else {
            typed = false
            break
          }
          field.typeText(String(character))
          Thread.sleep(forTimeInterval: 0.05)
        }
      }
      if typed && (secure || (field.value as? String) == text) { break }
      if attempt == 3 {
        diagnose("Typing into \(field) gave \(field.value ?? "nothing")")
        XCTFail("Could not type into \(field)")
      }
    }
    // Return closes the keyboard, so it cannot cover the next field.
    if !hasFocus(field) { focus(field) }
    field.typeText("\n")
  }

  /// Taps a field until it has the keyboard's focus. On a slow runner a tap
  /// on a screen just shown has missed (one run then failed outright typing
  /// into Primary address: "Neither element nor any descendant has keyboard
  /// focus"), and typing into a field without focus is an error XCUITest
  /// does not let the walkthrough recover from.
  private func focus(_ field: XCUIElement) {
    for _ in 1...3 {
      tap(field)
      let deadline = Date().addingTimeInterval(5)
      while Date() < deadline {
        if hasFocus(field) { return }
        Thread.sleep(forTimeInterval: 0.25)
      }
    }
    diagnose("\(field) never took the keyboard's focus")
    XCTFail("\(field) never took the keyboard's focus")
  }

  /// Found the way capture() finds what has focus, by a query, and matched
  /// to the field by its frame.
  private func hasFocus(_ field: XCUIElement) -> Bool {
    let focused = app.descendants(matching: field.elementType)
      .matching(NSPredicate(format: "hasKeyboardFocus == true")).firstMatch
    return focused.exists && focused.frame == field.frame
  }

  /// Deletes what a field holds. An empty field reports its placeholder as
  /// its value, which is left alone.
  private func clear(_ field: XCUIElement) {
    guard let current = field.value as? String, !current.isEmpty,
      current != field.placeholderValue
    else { return }
    // Put the cursor after the text first: a tap in the middle of it (one
    // run left "https://localhost:8443" growing with each retry) deletes
    // only what comes before.
    field.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap()
    field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 4))
  }

  /// Back one screen, and waits for the screen before it: a second tap during
  /// the animation can land on the outgoing screen's bar, which is still there.
  /// The previous screen is in the tree as soon as the animation starts, and
  /// both bars are during it, so it waits for the navigation bars to change
  /// and then hold still. Not a failure if they never change: a screen
  /// without a title may share its bar's identifier.
  private func back(to previous: XCUIElement, _ what: String) {
    let bars = { self.app.navigationBars.allElementsBoundByIndex.map(\.identifier) }
    let before = bars()
    tap(app.navigationBars.buttons.element(boundBy: 0))
    // A system sheet that came up as it was tapped takes the tap.
    if !previous.waitForExistence(timeout: 5), dismissSystemSheets(), bars() == before {
      tap(app.navigationBars.buttons.element(boundBy: 0))
    }
    var last = before
    let deadline = Date().addingTimeInterval(5)
    while Date() < deadline {
      Thread.sleep(forTimeInterval: 0.5)
      let now = bars()
      if now != before, now == last { break }
      last = now
    }
    wait(for: previous, what)
  }

  /// Scrolls until the screen stops moving, so a scrolled screenshot is of
  /// the end of the content rather than wherever a fling happened to stop.
  private func scrollToEnd() {
    var before = XCUIScreen.main.screenshot().pngRepresentation
    for _ in 0..<5 {
      app.swipeUp(velocity: .slow)
      Thread.sleep(forTimeInterval: 1.0)
      let after = XCUIScreen.main.screenshot().pngRepresentation
      if after == before { return }
      before = after
    }
  }
}
