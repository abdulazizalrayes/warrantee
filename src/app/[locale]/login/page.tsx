import { redirect } from "next/navigation";

export default function LoginPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/auth`);
}
