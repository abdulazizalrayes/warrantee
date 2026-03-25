import { redirect } from "next/navigation";

export default function SignupPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/auth?tab=signup`);
}
