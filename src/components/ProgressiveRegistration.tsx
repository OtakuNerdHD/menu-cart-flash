
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, EyeIcon, EyeOffIcon, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const ProgressiveRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: null as Date | null,
    cpf: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    avatar: null as File | null,
    avatarPreview: ''
  });
  
  // Estado para controle da UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isValidCpf, setIsValidCpf] = useState<boolean | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasLowerCase: false,
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    isLongEnough: false,
  });
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [usernameCount, setUsernameCount] = useState(0);

  // Validação e formatação de CPF
  const formatCPF = (cpf: string) => {
    // Remove todos os caracteres não numéricos
    const numericCPF = cpf.replace(/\D/g, '');

    // Formata o CPF (XXX.XXX.XXX-XX)
    if (numericCPF.length <= 3) {
      return numericCPF;
    } else if (numericCPF.length <= 6) {
      return `${numericCPF.substring(0, 3)}.${numericCPF.substring(3)}`;
    } else if (numericCPF.length <= 9) {
      return `${numericCPF.substring(0, 3)}.${numericCPF.substring(3, 6)}.${numericCPF.substring(6)}`;
    } else {
      return `${numericCPF.substring(0, 3)}.${numericCPF.substring(3, 6)}.${numericCPF.substring(6, 9)}-${numericCPF.substring(9, 11)}`;
    }
  };

  const validateCPF = (cpf: string) => {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) {
      return false;
    }
    
    // Verifica se todos os dígitos são iguais (caso inválido)
    if (/^(\d)\1+$/.test(cleanCPF)) {
      return false;
    }
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) {
      return false;
    }
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) {
      return false;
    }
    
    return true;
  };

  // Validar formato de e-mail
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Checar se o e-mail já existe
  const checkEmailAvailability = async (email: string) => {
    if (!isValidEmail(email)) {
      setEmailAvailable(null);
      return;
    }

    try {
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      setEmailAvailable(!data);
    } catch (error) {
      console.error('Erro ao verificar disponibilidade de e-mail:', error);
      setEmailAvailable(true); // Assume disponível em caso de erro
    }
  };

  // Checar se o username já existe
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      setUsernameAvailable(!data);
    } catch (error) {
      console.error('Erro ao verificar disponibilidade de username:', error);
      setUsernameAvailable(true); // Assume disponível em caso de erro
    }
  };

  // Gerar username único
  const generateUniqueUsername = async () => {
    try {
      // Obter contagem atual de usuários para gerar username único
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      const baseUsername = 'Delliapp';
      const newUsername = `${baseUsername}${(count || 0) + 1 + usernameCount}`;
      
      // Verificar se o username gerado já existe
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('username', newUsername)
        .single();

      if (data) {
        // Se já existe, incrementa contador e tenta novamente
        setUsernameCount(prev => prev + 1);
        return generateUniqueUsername();
      }

      return newUsername;
    } catch (error) {
      console.error('Erro ao gerar username:', error);
      return `Delliapp${Math.floor(Math.random() * 10000)}`;
    }
  };

  // Buscar endereço por CEP
  const searchAddressByCEP = async (cep: string) => {
    if (!cep || cep.length !== 9) return;

    setIsSearchingCep(true);
    try {
      // Remove caracteres não numéricos
      const cleanCEP = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Não foi possível encontrar o endereço para este CEP.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Ocorreu um erro ao consultar o serviço de CEP.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Formatar CEP
  const formatCEP = (cep: string) => {
    cep = cep.replace(/\D/g, ''); // Remove não-números
    cep = cep.replace(/^(\d{5})(\d)/, '$1-$2'); // Formata como 00000-000
    return cep;
  };

  // Formatar telefone
  const formatPhone = (phone: string) => {
    phone = phone.replace(/\D/g, ''); // Remove não-números
    if (phone.length <= 2) return phone;
    if (phone.length <= 7) return `(${phone.substring(0, 2)}) ${phone.substring(2)}`;
    return `(${phone.substring(0, 2)}) ${phone.substring(2, 7)}-${phone.substring(7, 11)}`;
  };

  // Verificar força da senha
  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      hasLowerCase: /[a-z]/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      isLongEnough: password.length >= 8,
    });
  };

  // Enviar link de confirmação para e-mail
  const sendConfirmationLink = async () => {
    if (!isValidEmail(formData.email) || !emailAvailable) {
      return;
    }

    setIsLoading(true);
    try {
      // URL de callback para a aplicação
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log("URL de redirecionamento:", redirectUrl);
      
      // Enviar e-mail de confirmação via Supabase Auth (OTP - One Time Password)
      const { data, error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) throw error;
      
      // Se não houver erro, o link foi enviado com sucesso
      setLinkSent(true);
      toast({
        title: "E-mail de confirmação enviado",
        description: `Um link de confirmação foi enviado para ${formData.email}. Por favor, verifique sua caixa de entrada e clique no link para continuar.`,
      });

    } catch (error: any) {
      console.error('Erro ao enviar e-mail de confirmação:', error);
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message || "Não foi possível enviar o e-mail de confirmação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se o usuário confirmou o e-mail
  useEffect(() => {
    if (step === 4 && linkSent) {
      // Configurar um listener para verificar quando o usuário se autenticar
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth event:", event, session);
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          toast({
            title: "E-mail confirmado",
            description: "Seu e-mail foi confirmado com sucesso!",
          });
          
          // Avançar para a próxima etapa
          setStep(5);
        }
      });

      // Limpar o listener quando o componente desmontar
      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [step, linkSent]);

  // Carregar imagem do avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 5MB.",
          variant: "destructive"
        });
        return;
      }

      setFormData({
        ...formData,
        avatar: file,
        avatarPreview: URL.createObjectURL(file)
      });
    }
  };

  // Finalizar registro
  const finalizeRegistration = async () => {
    setIsLoading(true);
    try {
      let avatarUrl = '';
      
      // 1. Fazer upload da imagem se houver
      if (formData.avatar) {
        const fileExt = formData.avatar.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('profiles')
          .upload(filePath, formData.avatar);

        if (!uploadError && data) {
          const { data: urlData } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath);
          avatarUrl = urlData.publicUrl;
        }
      }

      // 2. Criar usuário no Auth com os dados completos
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: formData.username,
            role: 'customer',
            avatar_url: avatarUrl
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Criar perfil para o usuário
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            name: `${formData.firstName} ${formData.lastName}`,
            username: formData.username,
            role: 'customer',
            avatar_url: avatarUrl
          });

        if (profileError) throw profileError;

        // 4. Usar a função RPC para inserir na tabela users
        const { error: userError } = await supabase.rpc('upsert_user', {
          user_id: authData.user.id,
          user_email: formData.email,
          user_username: formData.username, 
          user_avatar_url: avatarUrl,
          user_role: 'customer'
        });

        if (userError) throw userError;
      }

      toast({
        title: "Cadastro realizado com sucesso",
        description: "Seu cadastro foi concluído! Faça login para continuar.",
      });

      navigate('/login');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro ao realizar o cadastro.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar username automático quando chegar na etapa 7
  useEffect(() => {
    if (step === 7 && !formData.username) {
      (async () => {
        const username = await generateUniqueUsername();
        setFormData(prev => ({ ...prev, username }));
        setUsernameAvailable(true);
      })();
    }
  }, [step]);

  // Handlers para atualização de campos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCpf = formatCPF(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
      setIsValidCpf(validateCPF(formattedCpf));
    } 
    else if (name === 'zipCode') {
      const formattedCEP = formatCEP(value);
      setFormData(prev => ({ ...prev, [name]: formattedCEP }));
      
      if (formattedCEP.length === 9) {
        searchAddressByCEP(formattedCEP);
      }
    }
    else if (name === 'phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
    }
    else if (name === 'password') {
      setFormData(prev => ({ ...prev, [name]: value }));
      checkPasswordStrength(value);
    }
    else if (name === 'email' && value !== formData.email) {
      setFormData(prev => ({ ...prev, [name]: value }));
      setLinkSent(false);
      if (isValidEmail(value)) {
        checkEmailAvailability(value);
      } else {
        setEmailAvailable(null);
      }
    }
    else if (name === 'username') {
      setFormData(prev => ({ ...prev, [name]: value }));
      checkUsernameAvailability(value);
    }
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Navegação entre etapas
  const nextStep = () => {
    // Validações para cada etapa
    if (step === 1) {
      if (!formData.firstName || !formData.lastName) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, informe seu nome e sobrenome.",
          variant: "destructive"
        });
        return;
      }
    }
    else if (step === 2) {
      if (!formData.birthDate) {
        toast({
          title: "Campo obrigatório",
          description: "Por favor, informe sua data de nascimento.",
          variant: "destructive"
        });
        return;
      }
      
      if (!isValidCpf) {
        toast({
          title: "CPF inválido",
          description: "Por favor, informe um CPF válido.",
          variant: "destructive"
        });
        return;
      }
    }
    else if (step === 3) {
      if (!formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state || !formData.zipCode) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos de endereço.",
          variant: "destructive"
        });
        return;
      }
    }
    else if (step === 4) {
      if (!linkSent) {
        sendConfirmationLink();
        return;
      }
      
      // A verificação de e-mail é feita via efeito usando supabase.auth.onAuthStateChange
      return;
    }
    else if (step === 5) {
      if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) {
        toast({
          title: "Telefone inválido",
          description: "Por favor, informe um número de telefone válido com DDD.",
          variant: "destructive"
        });
        return;
      }
    }
    else if (step === 6) {
      if (!formData.password || !formData.confirmPassword) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, crie uma senha e confirme-a.",
          variant: "destructive"
        });
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Senhas não correspondem",
          description: "A senha e a confirmação de senha devem ser idênticas.",
          variant: "destructive"
        });
        return;
      }
      
      const isStrongPassword = Object.values(passwordStrength).every(value => value === true);
      if (!isStrongPassword) {
        toast({
          title: "Senha fraca",
          description: "Sua senha não atende aos requisitos mínimos de segurança.",
          variant: "destructive"
        });
        return;
      }
    }

    setStep(prev => (prev + 1) as Step);
  };

  const prevStep = () => {
    setStep(prev => (prev - 1) as Step);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Seu sobrenome"
                  required
                />
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <div className="flex">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${!formData.birthDate && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.birthDate ? format(formData.birthDate, 'dd/MM/yyyy', { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.birthDate || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, birthDate: date }))}
                        initialFocus
                        locale={ptBR}
                        captionLayout="dropdown-buttons"
                        fromYear={1930}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf" className="flex justify-between">
                  <span>CPF</span>
                  {formData.cpf && (
                    isValidCpf ? 
                      <span className="text-green-600 flex items-center text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> CPF válido
                      </span> : 
                      <span className="text-red-600 flex items-center text-xs">
                        <XCircle className="h-3 w-3 mr-1" /> CPF inválido
                      </span>
                  )}
                </Label>
                <Input
                  id="cpf"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="00000-000"
                  maxLength={9}
                  required
                  disabled={isSearchingCep}
                />
                {isSearchingCep && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Rua/Avenida</Label>
                <Input
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Rua/Avenida"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    name="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    placeholder="123"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    name="complement"
                    value={formData.complement}
                    onChange={handleInputChange}
                    placeholder="Apto, Bloco, etc."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleInputChange}
                  placeholder="Bairro"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Cidade"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="UF"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex justify-between">
                  <span>E-mail</span>
                  {formData.email && emailAvailable !== null && (
                    emailAvailable ? 
                      <span className="text-green-600 flex items-center text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> Disponível
                      </span> : 
                      <span className="text-red-600 flex items-center text-xs">
                        <XCircle className="h-3 w-3 mr-1" /> E-mail já cadastrado
                      </span>
                  )}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  required
                  disabled={linkSent}
                />
              </div>
              
              {linkSent ? (
                <div className="space-y-2">
                  <p className="text-sm text-center">
                    Um link de confirmação foi enviado para <strong>{formData.email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Por favor, verifique sua caixa de entrada e clique no link para continuar com o cadastro.
                  </p>
                  <div className="mt-4 text-center">
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={sendConfirmationLink}
                      disabled={isLoading}
                      className="mx-auto"
                    >
                      Reenviar link de confirmação
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        );

      case 5:
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone com DDD</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>
            </div>
          </>
        );

      case 6:
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className={`text-xs flex items-center ${passwordStrength.hasLowerCase ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasLowerCase ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    Letra minúscula
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasUpperCase ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasUpperCase ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    Letra maiúscula
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasNumber ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasNumber ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    Número
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.hasSpecialChar ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    Caractere especial
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.isLongEnough ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.isLongEnough ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    Mínimo 8 caracteres
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && formData.confirmPassword && (
                  <div className={`mt-1 text-xs flex items-center ${
                    formData.password === formData.confirmPassword ? "text-green-600" : "text-red-600"
                  }`}>
                    {formData.password === formData.confirmPassword ? 
                      <><CheckCircle className="h-3 w-3 mr-1" /> Senhas conferem</> : 
                      <><XCircle className="h-3 w-3 mr-1" /> Senhas não conferem</>
                    }
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 7:
        return (
          <>
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={formData.avatarPreview} />
                    <AvatarFallback className="bg-menu-primary text-white text-xl">
                      {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar" className="absolute -bottom-2 -right-2 bg-menu-primary text-white h-8 w-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-menu-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16"></path>
                      <circle cx="15" cy="9" r="2"></circle>
                      <path d="M2 17l.8.8A10 10 0 0 0 10 20h4a10 10 0 0 0 7.2-3.2l.8-.8"></path>
                    </svg>
                    <input
                      id="avatar"
                      type="file"
                      className="hidden"
                      onChange={handleAvatarChange}
                      accept="image/*"
                    />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Foto de perfil (opcional)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="flex justify-between">
                  <span>Nome de usuário</span>
                  {formData.username && usernameAvailable !== null && (
                    usernameAvailable ? 
                      <span className="text-green-600 flex items-center text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> Disponível
                      </span> : 
                      <span className="text-red-600 flex items-center text-xs">
                        <XCircle className="h-3 w-3 mr-1" /> Nome de usuário já em uso
                      </span>
                  )}
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Nome de usuário"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Este será seu nome de usuário no aplicativo. Você pode alterar depois.
                </p>
              </div>
            </div>
          </>
        );
    }
  };

  const getStepLabel = () => {
    switch (step) {
      case 1:
        return "Nome";
      case 2:
        return "Dados pessoais";
      case 3:
        return "Endereço";
      case 4:
        return "E-mail";
      case 5:
        return "Telefone";
      case 6:
        return "Senha";
      case 7:
        return "Perfil";
    }
  };

  const getNextButtonLabel = () => {
    if (step === 4 && !linkSent) return "Enviar link";
    if (step === 7) return "Concluir cadastro";
    return "Próximo";
  };

  const getNextButtonAction = () => {
    if (step === 7) return finalizeRegistration;
    return nextStep;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Cadastro - {getStepLabel()}</CardTitle>
        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
          <div 
            className="bg-menu-primary h-1.5 rounded-full transition-all duration-300" 
            style={{ width: `${(step / 7) * 100}%` }}
          ></div>
        </div>
      </CardHeader>
      <CardContent>
        {renderStep()}
      </CardContent>
      <CardFooter className="flex justify-between">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
            Voltar
          </Button>
        ) : (
          <div></div>
        )}
        <Button 
          type="button" 
          onClick={getNextButtonAction()} 
          disabled={
            isLoading || 
            (step === 4 && (!formData.email || !isValidEmail(formData.email) || !emailAvailable)) ||
            (step === 7 && (!formData.username || !usernameAvailable))
          }
        >
          {isLoading ? "Processando..." : getNextButtonLabel()}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProgressiveRegistration;
