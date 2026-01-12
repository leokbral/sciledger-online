<script lang="ts">
    import { Progress } from '@skeletonlabs/skeleton-svelte';
    import type { Paper } from '$lib/types/Paper';
    import type { User } from '$lib/types/User';
    import { getCorrectionTimeRemainingAuto, getCorrectionProgressPercentage, getEnhancedTimeDescription, getPhaseBasedTimeRemaining } from '$lib/helpers/correctionTimeHelper';
    
    interface Props {
        paper: Paper;
        currentUser?: User;
        showDetails?: boolean;
        size?: 'sm' | 'md' | 'lg';
        reviewAssignments?: any[];
    }
    
    let { paper, currentUser, showDetails = true, size = 'md', reviewAssignments }: Props = $props();
    
    // Calcular informações de tempo usando o novo sistema de fases
    const phaseTimeInfo = getPhaseBasedTimeRemaining(paper, currentUser, reviewAssignments);
    
    // Fallback para o sistema antigo se não houver informações de fase
    const timeInfo = phaseTimeInfo.hasDeadline ? phaseTimeInfo : getCorrectionTimeRemainingAuto(paper, currentUser, reviewAssignments);
    const progressPercentage = getCorrectionProgressPercentage(timeInfo);
    const enhancedTimeDescription = getEnhancedTimeDescription(timeInfo);
    
    // Determinar classes de estilo baseadas no status
    function getProgressBarClass() {
        if (!enhancedTimeDescription) return 'bg-gray-500';
        
        switch (enhancedTimeDescription.status) {
            case 'overdue':
                return 'bg-red-500';
            case 'urgent':
                return 'bg-orange-500';
            case 'warning':
                return 'bg-yellow-500';
            default:
                return 'bg-green-500';
        }
    }
    
    function getContainerClass() {
        const sizeClasses = {
            sm: 'p-2',
            md: 'p-3',
            lg: 'p-4'
        };
        
        if (!enhancedTimeDescription) return `${sizeClasses[size]} bg-gray-50 rounded-lg`;
        
        const baseClass = sizeClasses[size];
        
        switch (enhancedTimeDescription.status) {
            case 'overdue':
                return `${baseClass} bg-red-50 border-l-4 border-red-500 rounded-lg`;
            case 'urgent':
                return `${baseClass} bg-orange-50 border-l-4 border-orange-500 rounded-lg`;
            case 'warning':
                return `${baseClass} bg-yellow-50 border-l-4 border-yellow-500 rounded-lg`;
            default:
                return `${baseClass} bg-green-50 border-l-4 border-green-500 rounded-lg`;
        }
    }
    
    function getTextClass() {
        if (!enhancedTimeDescription) return 'text-gray-600';
        
        switch (enhancedTimeDescription.status) {
            case 'overdue':
                return 'text-red-800';
            case 'urgent':
                return 'text-orange-800';
            case 'warning':
                return 'text-yellow-800';
            default:
                return 'text-green-800';
        }
    }
    
    // Determinar o tipo de correção para exibição usando sistema de fases
    function getCorrectionPhase() {
        if (!timeInfo.hasDeadline) return null;
        // Se temos informações de fase, usar elas
        if (phaseTimeInfo.hasDeadline && phaseTimeInfo.phaseName) {
            return `${phaseTimeInfo.phaseName} (${phaseTimeInfo.totalDays} days)`;
        }
        // Fallback para sistema antigo, mas usando totalDays dinâmico
        if (paper.status === 'in review' && timeInfo.correctionType === 'reviewer') {
            return currentUser ? `Your Review Deadline (${timeInfo.totalDays} days)` : `Reviewer Correction Phase (${timeInfo.totalDays} days each)`;
        }
        if (paper.status === 'needing corrections' && timeInfo.correctionType === 'author') {
            return `Author Correction Phase (${timeInfo.totalDays} days)`;
        }
        // Fallback genérico
        return timeInfo.correctionType === 'reviewer' ? `Reviewer Phase (${timeInfo.totalDays} days)` : `Author Phase (${timeInfo.totalDays} days)`;
    }
</script>

{#if timeInfo.hasDeadline && enhancedTimeDescription}
    <div class={getContainerClass()}>
        <!-- Título da fase de correção -->
        {#if showDetails}
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold {getTextClass()}">
                    {getCorrectionPhase()}
                </h4>
                <span class="text-xs {getTextClass()}">
                    {enhancedTimeDescription.icon}
                </span>
            </div>
        {/if}
        
        <!-- Barra de progresso -->
        <div class="mb-2">
            <Progress 
                value={progressPercentage} 
                max={100}
            />
        </div>
        
        <!-- Informações de tempo -->
        {#if showDetails}
            <div class="flex items-center justify-between text-xs {getTextClass()}">
                <span class="font-medium">
                    {enhancedTimeDescription.description}
                </span>
                <span>
                    {progressPercentage}% elapsed
                </span>
            </div>
            
            <!-- Data limite -->
            {#if enhancedTimeDescription.deadlineFormatted}
                <div class="text-xs {getTextClass()} mt-1 opacity-75">
                    Deadline: {enhancedTimeDescription.deadlineFormatted}
                </div>
            {/if}
        {:else}
            <!-- Versão compacta -->
            <div class="flex items-center justify-between text-xs {getTextClass()}">
                <span>{enhancedTimeDescription.icon} {enhancedTimeDescription.description}</span>
                <span>{progressPercentage}%</span>
            </div>
        {/if}
    </div>
{:else if paper.status === 'in review' || paper.status === 'needing corrections'}
    <!-- Fallback para quando não há deadline específico -->
    <div class="p-2 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
        <div class="flex items-center text-xs text-blue-800">
            <span class="mr-2">⏳</span>
            <span>
                {paper.status === 'in review' ? 'Under review by peers' : 'Awaiting author corrections'}
            </span>
        </div>
    </div>
{/if}

<style>
    :global(.progress-bar) {
        background: var(--progress-bar-color, rgb(34, 197, 94)) !important;
    }
</style>