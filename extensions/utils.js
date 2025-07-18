export function getUserEmail() {
    const ariaLabel = document.querySelector('.gb_B.gb_Za.gb_0')?.getAttribute('aria-label') || "";
    const start = ariaLabel.indexOf('(');
    const end = ariaLabel.indexOf('@', start);

    if (start !== -1 && end !== -1) {
        return ariaLabel.substring(start + 1, end);
    }
    return "";
}
