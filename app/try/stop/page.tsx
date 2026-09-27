import { redirect } from "next/navigation";

/** Stop the genie is the main board now; this URL just points at it. */
export default function StopPage() {
  redirect("/");
}
