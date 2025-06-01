import React, { useState, useEffect } from 'react';
import { useTeam } from '@/context/TeamContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Users } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface TeamSelectorProps {
  showCreateButton?: boolean;
  className?: string;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({ 
  showCreateButton = true, 
  className = '' 
}) => {
  const { teamId, setTeamId } = useTeam();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      // Buscar todos os teams disponíveis
      // Em uma implementação real, isso seria filtrado por usuário
      const { data, error } = await supabase
        .from('restaurants')
        .select('team_id, name')
        .not('team_id', 'is', null);

      if (error) {
        console.error('Erro ao buscar teams:', error);
        return;
      }

      // Agrupar por team_id e criar lista única
      const uniqueTeams = data?.reduce((acc: Team[], restaurant) => {
        const existingTeam = acc.find(team => team.id === restaurant.team_id);
        if (!existingTeam && restaurant.team_id) {
          acc.push({
            id: restaurant.team_id,
            name: `Team ${restaurant.team_id}`,
            description: `Grupo de restaurantes ${restaurant.team_id}`,
            created_at: new Date().toISOString()
          });
        }
        return acc;
      }, []) || [];

      // Adicionar team padrão se não existir
      if (!uniqueTeams.find(team => team.id === 'default-team')) {
        uniqueTeams.unshift({
          id: 'default-team',
          name: 'Team Padrão',
          description: 'Team padrão do sistema',
          created_at: new Date().toISOString()
        });
      }

      setTeams(uniqueTeams);
    } catch (error) {
      console.error('Erro ao buscar teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (newTeamId: string) => {
    setTeamId(newTeamId);
    toast({
      title: 'Team alterado',
      description: `Agora você está visualizando o ${teams.find(t => t.id === newTeamId)?.name || newTeamId}`,
    });
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome do team é obrigatório',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreating(true);
      
      // Gerar um ID único para o team
      const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Criar um restaurante exemplo para o novo team
      const { error } = await supabase
        .from('restaurants')
        .insert({
          name: newTeamName,
          description: newTeamDescription || `Restaurante do ${newTeamName}`,
          team_id: teamId,
          owner_id: 'system' // Em uma implementação real, seria o ID do usuário atual
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Team criado com sucesso!',
        description: `O team "${newTeamName}" foi criado e está pronto para uso.`,
      });

      // Limpar formulário e fechar dialog
      setNewTeamName('');
      setNewTeamDescription('');
      setIsCreateDialogOpen(false);
      
      // Recarregar lista de teams
      await fetchTeams();
      
      // Selecionar o novo team
      setTeamId(teamId);
      
    } catch (error) {
      console.error('Erro ao criar team:', error);
      toast({
        title: 'Erro ao criar team',
        description: 'Ocorreu um erro ao criar o team. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const currentTeam = teams.find(team => team.id === teamId);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Team:</span>
      </div>
      
      <Select value={teamId || ''} onValueChange={handleTeamChange} disabled={loading}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={loading ? "Carregando..." : "Selecione um team"} />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>{team.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCreateButton && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Team</DialogTitle>
              <DialogDescription>
                Crie um novo team para organizar seus restaurantes e dados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-name">Nome do Team</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ex: Restaurante Central"
                />
              </div>
              <div>
                <Label htmlFor="team-description">Descrição (opcional)</Label>
                <Input
                  id="team-description"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Descrição do team..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateTeam} disabled={creating}>
                  {creating ? 'Criando...' : 'Criar Team'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {currentTeam && (
        <div className="text-xs text-gray-500">
          ({currentTeam.description})
        </div>
      )}
    </div>
  );
};

export default TeamSelector;