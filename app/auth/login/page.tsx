import AuthForm from "@/widgets/auth-form";

export default function LoginPage() {
  return (
    <AuthForm
      title="Вход в аккаунт"
      subtitle="Войдите или "
      url="/auth/register"
      linkText="зарегистрируйтесь"
      buttonTitle="Войти"
    />
  );
}
