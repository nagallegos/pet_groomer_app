exports.handler = async function handler(event, context) {
  const mod = await import("./appointment-reminders-impl.mjs");
  return mod.handler(event, context);
};
