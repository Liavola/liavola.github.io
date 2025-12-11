const buttonDecrement = document.querySelector("button:nth-of-type(1)");
const buttonIncrement = document.querySelector("button:nth-of-type(2)");
const counter = document.querySelector("output");

const increment = () => {
  counter.textContent = +counter.textContent + 1;
};

const decrement = () => {
  counter.textContent = +counter.textContent - 1;
};

buttonIncrement.addEventListener("click", async () => {
  if (
    document.startViewTransition &&
    matchMedia("(prefers-reduced-motion: no-preference)").matches
  ) {
    counter.style.setProperty("view-transition-name", "value-increment");
    const transition = document.startViewTransition(() => {
      increment();
    });

    await transition.finished;
    counter.style.removeProperty("view-transition-name");
  } else {
    increment();
  }
});

buttonDecrement.addEventListener("click", async () => {
  if (
    document.startViewTransition &&
    matchMedia("(prefers-reduced-motion: no-preference)").matches
  ) {
    counter.style.setProperty("view-transition-name", "value-decrement");
    const transition = document.startViewTransition(() => {
      decrement();
    });

    await transition.finished;
    counter.style.removeProperty("view-transition-name");
  } else {
    decrement();
  }
});
