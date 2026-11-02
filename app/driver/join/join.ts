import { redirect } from "next/navigation";
import { requireDriverSession } from "@/lib/driverAuth";
import { getDraft } from "@/lib/driverTrips";
import { findVendorByMobile } from "@/lib/vendors";

// Sign-up screens (10.5–10.11) are only for numbers that aren't a vendor yet.
export async function requireJoining() {
  const { mobile } = await requireDriverSession();
  if (await findVendorByMobile(mobile)) redirect("/driver");
  return { mobile, draft: await getDraft(mobile) };
}
