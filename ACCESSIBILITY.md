# Accessibility

## Implemented features

- Semantic header, main, sections, headings, footer, buttons, labels, and range inputs.
- All controls work with keyboard navigation and have visible focus indicators.
- Buttons have at least 48 px height; sliders use native keyboard interaction.
- Pause stops growth and wind together. Reset preserves the user's pause preference.
- Reduced-motion preferences show a mature plant paused initially. Enabling the preference during playback pauses it. Play allows an explicit opt-in.
- The SVG has an accessible title and description. Decorative guides do not convey required information.
- A polite status message announces play/pause changes. Frame-by-frame time and phase labels are intentionally not live announcements.
- System fonts, scalable SVG, and responsive layout avoid external dependencies.

## Verification and limitations

Automated Chromium tests cover keyboard buttons and sliders, visible focus, reduced-motion controls, and absence of horizontal overflow at 320, 390, 768, and 1440 px. Button sizes are checked. The page has also been visually inspected at narrow and wide sizes.

This is not an accessibility conformance claim. Screen readers, forced-color modes, browser text enlargement, Safari, Firefox, and physical touch devices have not been comprehensively tested. Native slider appearance varies by browser. Fine leaf detail and pale decorative guides have low contrast, but do not communicate control state. The animation's transient geometry is described generally rather than announced per frame. Without JavaScript, a message is shown but the plant does not grow and controls are inactive.

## Feedback

Open an issue at <https://github.com/Hostlife22/verdant/issues> with the affected control, steps, expected result, browser/OS, and assistive technology if applicable. Do not include personal or sensitive information. Contributions that improve usability and test coverage are welcome.
