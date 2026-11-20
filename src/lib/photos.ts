export const MAX_PHOTO_BYTES=5*1024*1024;
export function photoType(bytes:Uint8Array){
 if(bytes.length>MAX_PHOTO_BYTES||bytes.length<12)throw Error('La foto debe tener un máximo de 5 MB y ser JPG, PNG o WebP.');
 const starts=(a:number[])=>a.every((v,i)=>bytes[i]===v);
 if(starts([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))return 'image/png';
 if(starts([0xff,0xd8,0xff]))return 'image/jpeg';
 if(starts([0x52,0x49,0x46,0x46])&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 throw Error('Formato no admitido. Selecciona una foto JPG, PNG o WebP.');
}
