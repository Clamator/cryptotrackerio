import { createApp } from "vue";
import App from "./App.vue";
import "./assets/tailwind.css";

// createApp(App).mount("#app");
import "firebase/auth";
import "firebase/database";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import firebase from "firebase/compat/app";
import router from "@/router";
const firebaseConfig = {
  apiKey: "AIzaSyAt64mpM4u56mWdT5CmmqEfOEKBvHghDC0",
  authDomain: "cryptotrackerio.firebaseapp.com",
  projectId: "cryptotrackerio",
  storageBucket: "cryptotrackerio.appspot.com",
  messagingSenderId: "1063534969691",
  appId: "1:1063534969691:web:71ad24feeef13ed921507e",
  measurementId: "G-Q6ZT1S6DRG",
};
firebase.initializeApp(firebaseConfig);
let app;



firebase.auth().onAuthStateChanged(() => {
  if (!app) {
    app = createApp(App).use(router).mount("#app");
  }
});
