import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary si las variables de entorno están presentes
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
} else {
  console.warn(
    'Cloudinary is not configured. Media uploads will fall back to mock placeholder URLs. ' +
    'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable real uploads.'
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo para subir.' },
        { status: 400 }
      );
    }

    // Si Cloudinary no está configurado, simulamos el guardado regresando un avatar placeholder
    if (!isCloudinaryConfigured) {
      // Simular un pequeño retardo de red
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Retornar un avatar simulado según el nombre del archivo o un placeholder
      const mockUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80`;
      
      return NextResponse.json({
        url: mockUrl,
        message: 'Subida simulada con éxito (Modo Desarrollo/Mock activa).'
      });
    }

    // Convertir el archivo a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Cloudinary usando upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          folder: 'wonsfo_avatars',
          allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
          transformation: [{ width: 400, height: 400, crop: 'limit' }]
        },
        (error, result) => {
          if (error) {
            console.error('Error during Cloudinary stream upload:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    }) as any;

    return NextResponse.json({
      url: uploadResult.secure_url,
      message: 'Imagen subida a Cloudinary correctamente.'
    });

  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: `Error interno del servidor al subir archivo: ${error.message}` },
      { status: 500 }
    );
  }
}
