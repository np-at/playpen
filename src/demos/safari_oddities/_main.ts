import "./_index.css";

document.getElementById("b1")?.addEventListener("click", () => {
  document.querySelector("a")?.focus();
});

document.querySelector("a")?.addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelectorAll("a")[1].focus();
});
