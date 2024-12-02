import AuthForm from "@/widgets/AuthForm";

export default function page() {
  return (
    <AuthForm
      title="Вход в аккаунт"
      subtitle="Войдите или "
      url="/login/register"
      linkText="зарегистрируйтесь"
      buttonTitle="Войти"
    />
  );
}
