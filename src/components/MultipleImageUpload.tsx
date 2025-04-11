
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface MultipleImageUploadProps {
  onImagesUpload: (urls: string[]) => void;
  values?: string[];
  label?: string;
  maxSizeInMB?: number;
  maxImages?: number;
  acceptedFileTypes?: string;
}

const MultipleImageUpload: React.FC<MultipleImageUploadProps> = ({
  onImagesUpload,
  values = [],
  label = "Selecionar imagens",
  maxSizeInMB = 5,
  maxImages = 5,
  acceptedFileTypes = "image/*"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>(values);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Verificar se não excede o número máximo de imagens
    if (previews.length + files.length > maxImages) {
      toast({
        title: "Muitas imagens",
        description: `Você pode fazer upload de no máximo ${maxImages} imagens`,
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    const newPreviews = [...previews];
    const uploadPromises = [];
    
    // Processar cada arquivo
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Verificar tamanho do arquivo
      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB > maxSizeInMB) {
        toast({
          title: "Arquivo muito grande",
          description: `O arquivo ${file.name} excede o tamanho máximo de ${maxSizeInMB}MB`,
          variant: "destructive"
        });
        continue;
      }
      
      // Mostrar preview local
      const objectUrl = URL.createObjectURL(file);
      newPreviews.push(objectUrl);
      
      // Criar função de upload
      const uploadFunction = async () => {
        try {
          // Tentar fazer upload para o Supabase Storage se disponível
          let imageUrl = '';
          try {
            // Criar um nome de arquivo único
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `product-images/${fileName}`;
            
            // Upload para o Supabase Storage
            const { data, error } = await supabase
              .storage
              .from('images')
              .upload(filePath, file);
              
            if (error) {
              throw new Error(error.message);
            }
            
            // Obter URL pública da imagem
            const { data: publicUrl } = supabase
              .storage
              .from('images')
              .getPublicUrl(filePath);
              
            imageUrl = publicUrl?.publicUrl || '';
          } catch (err) {
            console.error('Erro no upload para o Supabase:', err);
            // Fallback para URL local temporária
            imageUrl = objectUrl;
          }
          
          return imageUrl;
        } catch (error) {
          console.error('Erro no upload:', error);
          toast({
            title: "Erro no upload",
            description: `Não foi possível carregar a imagem ${file.name}`,
            variant: "destructive"
          });
          return null;
        }
      };
      
      uploadPromises.push(uploadFunction());
    }
    
    // Atualizar previews
    setPreviews(newPreviews);
    
    // Executar todos os uploads
    try {
      const results = await Promise.all(uploadPromises);
      const validUrls = results.filter(url => url !== null) as string[];
      
      // Se temos URLs do Supabase, usamos elas, senão mantemos as locais temporárias
      if (validUrls.length > 0) {
        // Combinar URLs anteriores com novas
        const allUrls = [...previews.slice(0, previews.length - files.length), ...validUrls];
        onImagesUpload(allUrls);
      } else {
        onImagesUpload(newPreviews);
      }
      
      toast({
        title: "Upload concluído",
        description: `${validUrls.length} imagens carregadas com sucesso!`
      });
    } catch (error) {
      console.error('Erro nos uploads:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveImage = (index: number) => {
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    onImagesUpload(newPreviews);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {previews.map((preview, index) => (
          <div key={index} className="relative rounded-md overflow-hidden h-40 bg-gray-100">
            <img 
              src={preview} 
              alt={`Preview ${index + 1}`} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={() => handleRemoveImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {previews.length < maxImages && (
          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md h-40 bg-gray-50">
            <div className="space-y-2 text-center">
              <Plus className="mx-auto h-12 w-12 text-gray-400" />
              <div className="text-gray-500 text-sm">
                Adicionar imagem
              </div>
            </div>
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept={acceptedFileTypes}
              disabled={isUploading}
              multiple
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        {!isUploading && previews.length < maxImages && (
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept={acceptedFileTypes}
              multiple
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {label} ({previews.length}/{maxImages})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultipleImageUpload;
