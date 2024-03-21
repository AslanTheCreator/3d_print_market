import { CardProduct } from "@/widgets/CardProduct";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <CardProduct />
      <CardProduct />
      <CardProduct />
      <CardProduct />
    </main>
  );
}
