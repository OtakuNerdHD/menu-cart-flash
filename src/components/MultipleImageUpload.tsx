
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MultipleImageUploadProps {
  onUploadComplete: (urls: string[]) => void;
  maxImages?: number;
}

const MultipleImageUpload: React.FC<MultipleImageUploadProps> = ({ 
  onUploadComplete, 
  maxImages = 5 
}) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const generateFileName = (file: File) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    return `${timestamp}-${randomString}.${extension}`;
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const selectedFiles = Array.from(event.target.files);
      if (files.length + selectedFiles.length > maxImages) {
        toast({
          title: "Limite de imagens",
          description: `Você pode enviar no máximo ${maxImages} imagens`,
          variant: "destructive",
        });
        return;
      }

      // Criar previews para os arquivos selecionados
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
      setFiles([...files, ...selectedFiles]);
    } catch (error: any) {
      console.error('Erro ao selecionar imagens:', error.message);
      toast({
        title: "Erro",
        description: "Falha ao processar as imagens selecionadas",
        variant: "destructive",
      });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    
    // Liberar o URL do objeto para prevenir vazamento de memória
    URL.revokeObjectURL(newPreviews[index]);
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const uploadAllFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of files) {
        const fileName = generateFileName(file);
        const filePath = `products/${fileName}`;
        
        // Upload do arquivo para o bucket 'products' no Supabase Storage
        const { data, error } = await supabase.storage
          .from('products')
          .upload(filePath, file);
          
        if (error) {
          throw error;
        }
        
        // Obter a URL pública da imagem
        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrlData.publicUrl);
      }
      
      // Retornar as URLs das imagens através da callback
      onUploadComplete(uploadedUrls);
      
      // Limpar o estado local após upload bem-sucedido
      setFiles([]);
      setPreviews([]);
      
      toast({
        title: "Sucesso",
        description: `${uploadedUrls.length} imagens enviadas com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload das imagens:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao fazer upload das imagens",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="image-upload" className="cursor-pointer">
          <div className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center gap-2 text-sm">
            <Upload size={16} />
            Selecionar imagens
          </div>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <span className="text-sm text-muted-foreground">
          {files.length} / {maxImages} imagens
        </span>
      </div>
      
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative w-20 h-20 border rounded overflow-hidden">
              <img 
                src={preview} 
                alt={`Preview ${index}`} 
                className="w-full h-full object-cover" 
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                disabled={uploading}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {files.length > 0 && (
        <Button 
          type="button" 
          onClick={uploadAllFiles} 
          disabled={uploading || files.length === 0}
          className="w-full"
        >
          {uploading ? 'Enviando...' : 'Enviar imagens'}
        </Button>
      )}
    </div>
  );
};

export default MultipleImageUpload;
