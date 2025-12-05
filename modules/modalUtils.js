let modalRef = null;

export const openModal = (content) => {
  const { backdrop } = ensureModal();
  const body = backdrop.querySelector(".modal-body-content");
  if (body) {
    body.innerHTML = content;
  }
  backdrop.classList.add("is-visible");
};

export const closeModal = () => {
  if (modalRef && modalRef.backdrop) {
    modalRef.backdrop.classList.remove("is-visible");
  }
};

const ensureModal = () => {
  if (modalRef) return modalRef;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal-panel" role="dialog" aria-modal="true">
      <div class="modal-body-content"></div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const handleKeydown = (event) => {
    if (event.key === "Escape") closeModal();
  };
  window.addEventListener("keydown", handleKeydown);

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      closeModal();
    }
  });

  modalRef = { backdrop };
  return modalRef;
};
