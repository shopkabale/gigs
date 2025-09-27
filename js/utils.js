export function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        const placeholders = {
            thumbnail: 'https://placehold.co/400x300/e9ecef/34495e?text=Service',
            full: 'https://placehold.co/1200x900/e9ecef/34495e?text=Image',
            profile: 'https://placehold.co/150x150/e9ecef/34495e?text=User'
        };
        return placeholders[type] || placeholders.thumbnail;
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_400,h_300,f_auto,q_auto',
        full: 'c_limit,w_1200,h_1200,f_auto,q_auto',
        profile: 'c_fill,g_face,w_150,h_150,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) return url;
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}