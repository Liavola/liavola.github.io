const buttonDecrement = document.querySelector("button:nth-of-type(1)");
const buttonIncrement = document.querySelector("button:nth-of-type(2)");
const counter = document.querySelector("output");

let isTransitioning = false;

const increment = () => {
  counter.textContent = +counter.textContent + 1;
};

const decrement = () => {
  counter.textContent = +counter.textContent - 1;
};

const runWithTransition = async (updateFunction, transitionName) => {
  if (isTransitioning) return;

  if (
    !document.startViewTransition ||
    !matchMedia("(prefers-reduced-motion: no-preference)").matches
  ) {
    updateFunction();
    return;
  }

  isTransitioning = true;

  try {
    counter.style.setProperty("view-transition-name", transitionName);
    const transition = document.startViewTransition(updateFunction);
    await transition.ready;
    await transition.finished;
  } catch (error) {
    console.warn("View transition failed:", error);

    updateFunction();
  } finally {
    counter.style.removeProperty("view-transition-name");
    isTransitioning = false;
  }
};

buttonIncrement.addEventListener("click", () => {
  runWithTransition(increment, "value-increment");
});

buttonDecrement.addEventListener("click", () => {
  runWithTransition(decrement, "value-decrement");
});
