window.addEventListener("DOMContentLoaded", (event) => {
    const header = document.getElementById("header");
    const welcomeText = document.getElementById("welcome-text");
    const restOfContent = document.body.querySelectorAll("body > :not(header)");

    // Initial state
    welcomeText.style.opacity = "1";

    // Start the animation after a short delay
    setTimeout(() => {
        welcomeText.style.transform = "translateY(-100%)";

        // After the text has animated, reveal the rest of the page content
        welcomeText.addEventListener("transitionend", () => {
            header.style.height = "auto";
            welcomeText.remove();

            restOfContent.forEach((element) => {
                element.style.display = "";
            });

            // Fade in the rest of the content
            restOfContent.forEach((element, index) => {
                setTimeout(() => {
                    element.style.opacity = "1";
                    element.style.transition = "opacity 1s";
                    element.style.opacity = "1";
                }, index * 500); // Staggered effect
            });
        });
    }, 500);
});
