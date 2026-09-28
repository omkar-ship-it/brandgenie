import { redirect } from "next/navigation";

/** The comparison is over — stop the genie won, and it's the only board now. */
export default function Page() {
  redirect("/try");
}
