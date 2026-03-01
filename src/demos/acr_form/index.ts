import "./styles.scss"

import  * as bootstrap from "bootstrap";
import { MyTable } from "./table.ts";
import { setupHandleFileSelect } from "./loadFile.ts";
import { ACRFormState } from "./State.ts";

const defaultFormState: { findings: ACRFormState["findings"] } = {
  findings: [
    {
      id: "Alt-version-conformant",
      test_name: "1.A",
      test_condition: "The identified version passes all applicable Test Conditions in this test process.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "Alt-version-equivalent",
      test_name: "1.B",
      test_condition: "The identified version is up-to-date with the same information and functionality.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "Alt-version-access",
      test_name: "1.C",
      test_condition: "The mechanism to reach the accessible equivalent version from the non-conforming page is accessible.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "Non-interference",
      test_name: "1.D",
      test_condition: "Content in the non-conforming version(s) meets Conformance Requirement 5.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "1.4.2-Audio-control",
      test_name: "2.A",
      test_condition: "The user can pause, stop, or control the volume of audio content that plays automatically.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.2.2-Blinking-moving-scrolling",
      test_name: "2.B",
      test_condition: "The user can pause, stop, or hide moving, blinking, or scrolling content.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.2.2-Auto-updating",
      test_name: "2.C",
      test_condition: "The user can pause, stop, hide, or control the frequency of automatically updating content.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "4.1.2-change-notify-auto",
      test_name: "2.D",
      test_condition: "The page provides notification of each automatic update/change in content.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.3.1-flashing",
      test_name: "3.A",
      test_condition: "Web pages do not contain content that flashes more than three times in a one second period.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.1.1-keyboard-access",
      test_name: "4.A",
      test_condition: "All functionality can be accessed and executed using only the keyboard.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.1.1-no-keystroke-timing",
      test_name: "4.B",
      test_condition: "Individual keystrokes do not require specific timings for activation of functionality.s",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.1.2-no-keyboard-trap",
      test_name: "4.C",
      test_condition: "There is no keyboard trap.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.4.7-focus-visible",
      test_name: "4.D",
      test_condition: "A visible indication of focus is provided when focus is on the interface component.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "3.2.1-on-focus",
      test_name: "4.E",
      test_condition: "When an interface component receives focus, it does not initiate an unexpected change of context.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.4.3-focus-order-meaning",
      test_name: "4.F",
      test_condition: "The focus order preserves the meaning and operability of the web page.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "3.3.2-label-provided",
      test_name: "5.A",
      test_condition: "Visual labels or instructions are provided for form elements.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "2.4.6-label-descriptive",
      test_name: "5.B",
      test_condition: "Each visual form label is sufficiently descriptive.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "1.3.1-programmatic-label",
      test_name: "5.C",
      test_condition:
        "The combination of the accessible name, accessible description, and other programmatic associations (e.g., table column and/or row associations) describes each input field and includes all relevant instructions and cues (textual and graphical)",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "3.2.2-on-input",
      test_name: "5.D",
      test_condition:
        "Changing field values/selections (e.g., entering data in a text field, changing a radio button section) does NOT initiate and unexpected change of context.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
    {
      id: "3.3.1-error-identification",
      test_name: "5.F",
      test_condition: "The item in error is identified in text and sufficiently described to the user in text.",
      test_result: "Pass",
      tester_comments: "",
      location: "",
      global_issue: true,
    },
  ],
};
const state = new ACRFormState();
if (state.findings.length === 0) {
  state.findings = defaultFormState.findings;
}
window._state = state;

const _table = new MyTable('#myTable');
window._state.findings.forEach(finding => _table.addRow(finding));
// setupHandleFileSelect();


declare global {
  interface Window {
    _state: ACRFormState;
  }
}
