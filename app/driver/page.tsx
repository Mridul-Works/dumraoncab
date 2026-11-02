import { redirect } from "next/navigation";
import { getDriver, getPrefs } from "@/lib/driverTrips";

// Front door: sends the driver to the right screen for where they are.
export default async function DriverHome() {
  const me = await getDriver();
  if (!me) redirect("/driver/welcome");
  const v = me.vendor;
  if (!v) redirect("/driver/join/details"); // new number → set up (10.5)
  if (v.status === "pending" || v.status === "rejected") redirect("/driver/status");
  const prefs = await getPrefs(v.id);
  if (v.status === "approved" && !prefs.seenApproved) redirect("/driver/approved");
  if (v.status === "approved" && !prefs.settingsDone) redirect("/driver/settings");
  redirect("/driver/today");
}
