export function initVideo() {
  document.querySelectorAll("video").forEach((video) => {
    const wrapper = video.closest(".hero-media, [data-video]") || video.parentElement;
    const failOpen = () => {
      video.hidden = true;
      wrapper?.classList.add("no-media");
    };
    video.controls = true;
    video.muted = true;
    video.autoplay = false;
    video.removeAttribute("autoplay");
    if (!video.getAttribute("poster")?.trim()) {
      failOpen();
      return;
    }
    video.addEventListener("error", failOpen, { once: true });
  });
}
