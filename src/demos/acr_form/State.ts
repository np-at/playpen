import { type Static, Type } from "typebox";
import { Compile } from "typebox/compile";

export const TestName = Type.Enum({
  "Keyboard Navigation": "Keyboard Navigation",
  "Screen Reader": "Screen Reader",
  });
export const TestResult = Type.Enum({
  Pass: "Pass",
  Fail: "Fail",
  "Does Not Apply": "Does Not Apply",
  "Not Tested": "Not Tested",
})
const TestingInformationSchema = Type.Object({
  tested_by: Type.String(),
  browsers_used: Type.Array(Type.String()),
});
const ProductInformationSchema = Type.Object({
  name: Type.String(),
  version: Type.Optional(Type.String()),
  owner_vendor: Type.String(),
  product_type: Type.String(),
  location_or_url: Type.String(),
  product_description: Type.String(),
  notes: Type.Optional(Type.String()),
});

const TestFindingSchema = Type.Object({
  id: Type.String(),
  test_name: TestName,
  test_condition: Type.String(),
  test_result: TestResult,
  tester_comments: Type.String(),
  location: Type.String(),
  global_issue: Type.Boolean(),
  screenshot: Type.Optional(Type.String()),
});

const ACRFormStateSchema = Type.Object({
  findings: Type.Array(TestFindingSchema),
  product_info: Type.Optional(ProductInformationSchema),
  testing_info: Type.Optional(TestingInformationSchema),
});
const ACRFormStateValidator = Compile(ACRFormStateSchema);
export class ACRFormState {
  private initialized = false;
  private _testing_info: Static<typeof TestingInformationSchema> | undefined = undefined;

  public get testing_info(): Static<typeof TestingInformationSchema> | undefined {
    if (!this.initialized) {
      this.load();
      this.initialized = true;
    }
    return this._testing_info;
  }

  public set testing_info(value: Static<typeof TestingInformationSchema> | undefined) {
    this._testing_info = value;
    this.save();
  }
  private _product_info: Static<typeof ProductInformationSchema> | undefined = undefined;

  public get product_info(): Static<typeof ProductInformationSchema> | undefined {
    if (!this.initialized) {
      this.load();
      this.initialized = true;
    }
    return this._product_info;
  }

  public set product_info(value: Static<typeof ProductInformationSchema> | undefined) {
    this._product_info = value;
    this.save();
  }
  public get findings(): Static<typeof TestFindingSchema>[] {
    if (!this.initialized) {
      this.load();
      this.initialized = true;
    }
    return this._findings;
  }

  public set findings(value: Static<typeof TestFindingSchema>[]) {
    this._findings = value;
    this.save();
  }
  private _findings: Static<typeof TestFindingSchema>[] = [];
  public save() {
    const data = {
      findings: this._findings,
      product_info: this._product_info,
      testing_info: this._testing_info,
    };
    localStorage.setItem("acr_form_state", JSON.stringify(data));
  }
  public load() {
    const data = localStorage.getItem("acr_form_state");
    if (data) {
      const d: unknown = JSON.parse(data);
      const errs = ACRFormStateValidator.Errors(d);
      if (errs.length > 0) {
        throw new Error(`Invalid data in localStorage for ACRFormState: ${JSON.stringify(errs)}`);
      }
      const parsed = ACRFormStateValidator.Parse(d);
      this._findings = parsed.findings;
      this._product_info = parsed.product_info;
      this._testing_info = parsed.testing_info;
    }
  }
}
