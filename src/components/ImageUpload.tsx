import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { uploadMedia } from '@/lib/media';

interface ImageUploadProps {
  onImageUpload: (url: string) => void;
  value?: string;
  label?: string;
  maxSizeInMB?: number;
  acceptedFileTypes?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  value,
  label = "Selecionar imagem",
  maxSizeInMB = 3,
  acceptedFileTypes = "image/*"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const { currentTeam } = useMultiTenant();
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verificar tamanho do arquivo
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo excede o tamanho máximo de ${maxSizeInMB}MB`,
        variant: "destructive"
      });
      return;
    }
    
    // Preview local (não será persistido)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    setIsUploading(true);
    
    try {
      const { url } = await uploadMedia(file, {
        folder: 'products',
        teamId: currentTeam?.id ?? null,
        bucket: 'produtos',
        maxWidth: 1280,
        maxHeight: 1280,
        maxBytes: 3 * 1024 * 1024,
        quality: 0.85,
      });
      onImageUpload(url);
      
      toast({
        title: "Upload concluído",
        description: "Imagem carregada com sucesso!"
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar a imagem. Verifique o bucket 'produtos' e permissões públicas.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveImage = () => {
    setPreview(null);
    onImageUpload('');
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative rounded-md overflow-hidden h-40 bg-gray-100">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={() => {
              setPreview('/placeholder.svg');
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-40 bg-gray-50">
          <div className="space-y-2 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="text-gray-500 text-sm">
              {isUploading ? 'Carregando...' : 'Arraste e solte ou clique para selecionar'}
            </div>
          </div>
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept={acceptedFileTypes}
            disabled={isUploading}
          />
        </div>
      )}
      
      <div className="flex justify-center">
        {!isUploading && !preview && (
          <div className="relative w-full">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept={acceptedFileTypes}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
