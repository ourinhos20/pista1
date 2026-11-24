/**
 * Reduz a foto no próprio aparelho antes de enviar (máx. 1600 px, JPEG).
 * Foto de celular de 4-8 MB vira ~300 KB: envio rápido no 4G e não esbarra
 * no limite de upload da hospedagem.
 */
export function compressImage(file: File, max = 1600, quality = 0.85): Promise<File> {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) return resolve(file);
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const s = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * s);
            canvas.height = Math.round(img.height * s);
            canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file);
                },
                'image/jpeg',
                quality,
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });
}
