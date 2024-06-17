import AuthForm from "@/widgets/AuthForm";

const page = () => {
  return (
    <AuthForm
      title="Регистрация"
      subtitle="У вас уже есть учетная запись?"
      url="/login"
      linkText="Авторизуйтесь"
      buttonTitle="Зарегистрироваться"
    />
  );
};

export default page;
