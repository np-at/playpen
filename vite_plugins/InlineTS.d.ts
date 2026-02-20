declare module "ts:*" {
  const value: string;
  export default value;
}
declare module "virtual:site-map" {
  const htmlFiles: Record<string, string>;
}
