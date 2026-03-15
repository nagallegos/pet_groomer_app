exports.handler = async function handler(event, context) {
  const mod = await import("./api-impl.mjs");
  return mod.handler(event, context);
};
