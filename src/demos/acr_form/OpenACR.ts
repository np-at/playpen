import { type Static, Type } from "typebox";
import { Compile } from "typebox/compile";

const OpenACRCriteriaSchema = Type.Object({
  num: Type.String({ description: '"Criteria number."' }),
  components: Type.Optional(
    Type.Array(
      Type.Object({
        name: Type.String({ description: "Name of component. E.g. Web, Electronic Documents, Authoring Tools, Software, and so on." }),
        adherence: Type.Optional(
          Type.Object({
            level: Type.String({ description: "The conformance level of the component" }),
            notes: Type.Optional(Type.String({ description: "Remarks and Explanations." })),
          }),
        ),
      }),
    ),
  ),
});
const OpenACRChapterSchema = Type.Object({
  notes: Type.Optional(Type.String({ description: "Any details or explanation about the chapter." })),
  disabled: Type.Optional(Type.Boolean({ description: "Whether this chapter's criteria is not going to be provided in the ACR." })),
  criteria: Type.Array(OpenACRCriteriaSchema, { description: "The list of criteria under this chapter." }),
});
const OpenACRContactSchema = Type.Object({
  name: Type.Optional(Type.String()),
  company_name: Type.Optional(Type.String()),
  address: Type.Optional(Type.String()),
  phone: Type.Optional(Type.String()),
  website: Type.Optional(Type.String()),
  email: Type.String(),
});
export const OpenACRSchema = Type.Object({
  title: Type.String({
    description: "The title of the report in the heading format of '[Company Name] Accessibility Conformance Report'.",
  }),
  product: Type.Object({
    name: Type.String({ description: "Product name." }),
    version: Type.Optional(Type.String({ description: "Product version if available." })),
    description: Type.Optional(Type.String({ description: "A brief description of the product." })),
  }),
  author: Type.Object(OpenACRContactSchema.properties, { description: "Author information." }),
  vendor: Type.Optional(Type.Object(OpenACRContactSchema.properties, { description: "Vendor information." })),
  report_date: Type.Optional(Type.String({ description: "The date of the report in rfc3339 format.", format: "date" })),
  last_modified_date: Type.Optional(
    Type.String({ description: "The last modified date of the report in rfc3339 format.", format: "date" }),
  ),
  version: Type.Optional(Type.Integer({ description: "Version of this OpenACR document. E.g. drupal-9.1-3" })),
  notes: Type.Optional(Type.String({ description: "Any details or explanation about the report." })),
  evaluation_methods_used: Type.Optional(
    Type.String({
      description: "Include a description of evaluation methods used to complete the OpenACR for the product under test.",
    }),
  ),
  legal_disclaimer: Type.Optional(
    Type.String({
      description: "Area for any legal disclaimer text required by your organization.",
    }),
  ),
  license: Type.Optional(
    Type.String({
      description:
        "You should specify a license for your OpenACR so that people know how they are permitted to use it, and any restrictions you're placing on it. Must be a valid SPDX license see https://spdx.org/licenses/. If none is provided 'CC-BY-4.0' is assumed default in any output.",
    }),
  ),
  repository: Type.Optional(
    Type.String({
      description: "Specify the place where your OpenACR lives. This is helpful for people who want to contribute.",
    }),
  ),
  related_openacrs: Type.Optional(
    Type.Array(
      Type.Object({
        url: Type.Optional(Type.String({ description: "Link to related OpenACR." })),
        type: Type.Optional(
          Type.Enum(["primary", "secondary"], { description: "Specify whether the link is a primary or secondary." }),
        ),
      }),
    ),
  ),
  catalog: Type.Optional(
    Type.String({ description: "Name of the catalog to build and validate the OpenACR. E.g. 2.4-edition-wcag-2.0-508-en." }),
  ),
  chapters: Type.Optional(
    Type.Object(
      {
        success_criteria_level_a: Type.Optional(
          Type.Object(OpenACRChapterSchema.properties, { description: "Success criteria level A. Table/chapter 1 in all versions." }),
        ),
        success_criteria_level_aa: Type.Optional(
          Type.Object(OpenACRChapterSchema.properties, { description: "Success criteria level AA. Table/chapter 2 in all versions." }),
        ),
        success_criteria_level_aaa: Type.Optional(
          Type.Object(OpenACRChapterSchema.properties, {
            description: "Success criteria level AAA. Table/chapter 3 in all versions.",
          }),
        ),
        functional_performance_criteria: Type.Optional(
          Type.Object(OpenACRChapterSchema.properties, {
            description: "Functional Performance Criteria (FPC) (chapter 3 in 508/INT versions, chapter 4 in EU version).",
          }),
        ),
        hardware: Type.Optional(
          Type.Object(OpenACRChapterSchema.properties, {
            description: "Hardware (chapter 4 in 508/INT versions, chapter 8 in EU version).",
          }),
        ),
        software: Type.Optional(
          Type.Object(OpenACRChapterSchema.properties, {
            description: "Software (chapter 5 in 508/INT versions, chapter 11 in EU version).",
          }),
        ),
        support_documentation_and_services: Type.Optional(
          Type.Object(OpenACRChapterSchema.properties, {
            description: "Support Documentation and Services (chapter 6 in 508/INT versions, chapter 12 in EU version).",
          }),
        ),
      },
      { description: "https://github.com/GSA/openacr/blob/main/schema/openacr-0.1.0.json" },
    ),
  ),
});

export const OpenACRValidator = Compile(OpenACRSchema);
export type OpenACR = Static<typeof OpenACRSchema>;
