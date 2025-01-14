import AuthForm from "@/widgets/auth-form";

export default function RegisterPage() {
  return (
    <AuthForm
      title="Регистрация"
      subtitle="У вас уже есть учетная запись?"
      url="/login"
      linkText="Авторизуйтесь"
      buttonTitle="Зарегистрироваться"
    />
  );
}
