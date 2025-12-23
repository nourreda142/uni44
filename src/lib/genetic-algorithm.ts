import { Gene, Chromosome, GAConfig, ConflictInfo, Course, Instructor, Section, Room, TimeSlot } from './types';

// Default GA configuration
export const defaultGAConfig: GAConfig = {
  populationSize: 100,
  generations: 500,
  mutationRate: 0.1,
  crossoverRate: 0.8,
  elitismCount: 5,
  tournamentSize: 5,
};

// Instructor availability type
export interface InstructorAvailability {
  instructorId: string;
  timeSlotId: string;
  isAvailable: boolean;
  preferenceLevel: number; // 1 = available, 2 = preferred, 3 = highly preferred
}

// Random selection helper
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Weighted random selection for time slots based on instructor preferences
function selectTimeSlotForInstructor(
  instructorId: string,
  timeSlots: TimeSlot[],
  availabilityMap: Map<string, InstructorAvailability>
): TimeSlot {
  // Get available slots for this instructor
  const availableSlots: { slot: TimeSlot; weight: number }[] = [];
  
  for (const slot of timeSlots) {
    const key = `${instructorId}_${slot.id}`;
    const availability = availabilityMap.get(key);
    
    // Default to available if no preference set
    const isAvailable = availability?.isAvailable ?? true;
    const preferenceLevel = availability?.preferenceLevel ?? 1;
    
    if (isAvailable) {
      // Weight: highly preferred = 9, preferred = 4, available = 1
      const weight = preferenceLevel === 3 ? 9 : preferenceLevel === 2 ? 4 : 1;
      availableSlots.push({ slot, weight });
    }
  }
  
  // If no available slots, fall back to any slot
  if (availableSlots.length === 0) {
    return randomChoice(timeSlots);
  }
  
  // Weighted random selection
  const totalWeight = availableSlots.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const { slot, weight } of availableSlots) {
    random -= weight;
    if (random <= 0) return slot;
  }
  
  return availableSlots[availableSlots.length - 1].slot;
}

// Generate random chromosome with availability preferences
// Creates separate entries for Doctor (lectures per group) and TA (sections per section)
function generateRandomChromosome(
  courses: Course[],
  sections: Section[],
  rooms: Room[],
  timeSlots: TimeSlot[],
  availabilityMap: Map<string, InstructorAvailability>
): Chromosome {
  const genes: Gene[] = [];

  // Get unique groups from sections
  const groupsMap = new Map<string, Section[]>();
  for (const section of sections) {
    const groupId = section.groupId;
    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, []);
    }
    groupsMap.get(groupId)!.push(section);
  }

  // For each course
  for (const course of courses) {
    // 1. Create LECTURE entries (Doctor teaches all sections in a group together)
    if (course.doctorId) {
      for (const [groupId, groupSections] of groupsMap) {
        // Doctor gives one lecture to all sections in the group
        // We pick the first section as representative (all sections attend)
        const timeSlot = selectTimeSlotForInstructor(course.doctorId, timeSlots, availabilityMap);
        
        // Add one entry per section in the group (they all attend the same lecture)
        for (const section of groupSections) {
          genes.push({
            courseId: course.id,
            instructorId: course.doctorId,
            sectionId: section.id,
            roomId: randomChoice(rooms.filter(r => r.roomType === 'lecture_hall') || rooms).id,
            timeSlotId: timeSlot.id,
          });
        }
      }
    }

    // 2. Create SECTION entries (TA teaches each section separately)
    if (course.taId) {
      for (const section of sections) {
        const timeSlot = selectTimeSlotForInstructor(course.taId, timeSlots, availabilityMap);
        
        genes.push({
          courseId: course.id,
          instructorId: course.taId,
          sectionId: section.id,
          roomId: randomChoice(rooms.filter(r => r.roomType === 'lab' || r.roomType === 'seminar_room') || rooms).id,
          timeSlotId: timeSlot.id,
        });
      }
    }

    // Fallback: if no doctor or TA, create entry with doctor or empty
    if (!course.doctorId && !course.taId) {
      for (const section of sections) {
        genes.push({
          courseId: course.id,
          instructorId: '',
          sectionId: section.id,
          roomId: randomChoice(rooms).id,
          timeSlotId: randomChoice(timeSlots).id,
        });
      }
    }
  }

  return { genes, fitness: 0 };
}

// Count conflicts in a chromosome
function countConflicts(chromosome: Chromosome): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const genes = chromosome.genes;

  for (let i = 0; i < genes.length; i++) {
    for (let j = i + 1; j < genes.length; j++) {
      const gene1 = genes[i];
      const gene2 = genes[j];

      // Skip if not in same time slot
      if (gene1.timeSlotId !== gene2.timeSlotId) continue;

      // Instructor conflict: same instructor, same time slot
      if (gene1.instructorId === gene2.instructorId && gene1.instructorId !== '') {
        conflicts.push({
          type: 'instructor',
          description: 'Instructor teaching two lectures at the same time',
          genes: [gene1, gene2],
        });
      }

      // Room conflict: same room, same time slot
      if (gene1.roomId === gene2.roomId) {
        conflicts.push({
          type: 'room',
          description: 'Two lectures scheduled in the same room at the same time',
          genes: [gene1, gene2],
        });
      }

      // Section conflict: same section, same time slot
      if (gene1.sectionId === gene2.sectionId) {
        conflicts.push({
          type: 'section',
          description: 'Section has two lectures at the same time',
          genes: [gene1, gene2],
        });
      }
    }
  }

  return conflicts;
}

// Calculate fitness score with availability preferences
function calculateFitness(
  chromosome: Chromosome, 
  timeSlots: TimeSlot[],
  availabilityMap: Map<string, InstructorAvailability>
): number {
  const conflicts = countConflicts(chromosome);
  
  // Hard constraints: heavily penalize conflicts
  let fitness = 1000 - conflicts.length * 100;

  // Soft constraints
  const genes = chromosome.genes;
  
  // Availability preference bonus/penalty
  let availabilityScore = 0;
  for (const gene of genes) {
    if (gene.instructorId) {
      const key = `${gene.instructorId}_${gene.timeSlotId}`;
      const availability = availabilityMap.get(key);
      
      if (availability) {
        if (!availability.isAvailable) {
          // Heavy penalty for unavailable slots
          availabilityScore -= 50;
        } else {
          // Bonus for preferred slots
          if (availability.preferenceLevel === 3) {
            availabilityScore += 15; // Highly preferred
          } else if (availability.preferenceLevel === 2) {
            availabilityScore += 8; // Preferred
          }
        }
      }
    }
  }
  
  // Penalize late slots (slots with order > 2)
  const lateSlotPenalty = genes.filter(gene => {
    const slot = timeSlots.find(ts => ts.id === gene.timeSlotId);
    return slot && slot.slotOrder > 2;
  }).length * 2;

  // Reward even distribution across days
  const daysUsed = new Set(
    genes.map(gene => {
      const slot = timeSlots.find(ts => ts.id === gene.timeSlotId);
      return slot?.day;
    }).filter(Boolean)
  );
  const distributionBonus = daysUsed.size * 10;

  // Calculate lectures per day for balance
  const lecturesPerDay: Record<string, number> = {};
  genes.forEach(gene => {
    const slot = timeSlots.find(ts => ts.id === gene.timeSlotId);
    if (slot) {
      lecturesPerDay[slot.day] = (lecturesPerDay[slot.day] || 0) + 1;
    }
  });
  
  const dayValues = Object.values(lecturesPerDay);
  const avgPerDay = dayValues.reduce((a, b) => a + b, 0) / dayValues.length || 0;
  const balanceVariance = dayValues.reduce((sum, val) => sum + Math.abs(val - avgPerDay), 0);
  const balancePenalty = balanceVariance * 2;

  fitness = fitness + availabilityScore - lateSlotPenalty + distributionBonus - balancePenalty;

  return Math.max(0, fitness);
}

// Tournament selection
function tournamentSelection(population: Chromosome[], tournamentSize: number): Chromosome {
  const tournament: Chromosome[] = [];
  
  for (let i = 0; i < tournamentSize; i++) {
    tournament.push(randomChoice(population));
  }
  
  return tournament.reduce((best, current) => 
    current.fitness > best.fitness ? current : best
  );
}

// Single-point crossover
function crossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
  if (parent1.genes.length === 0 || parent2.genes.length === 0) {
    return [
      { genes: [...parent1.genes], fitness: 0 },
      { genes: [...parent2.genes], fitness: 0 },
    ];
  }

  const crossoverPoint = Math.floor(Math.random() * parent1.genes.length);
  
  const child1Genes = [
    ...parent1.genes.slice(0, crossoverPoint),
    ...parent2.genes.slice(crossoverPoint),
  ];
  
  const child2Genes = [
    ...parent2.genes.slice(0, crossoverPoint),
    ...parent1.genes.slice(crossoverPoint),
  ];

  return [
    { genes: child1Genes, fitness: 0 },
    { genes: child2Genes, fitness: 0 },
  ];
}

// Mutation with availability awareness
function mutate(
  chromosome: Chromosome,
  mutationRate: number,
  rooms: Room[],
  timeSlots: TimeSlot[],
  availabilityMap: Map<string, InstructorAvailability>
): Chromosome {
  const mutatedGenes = chromosome.genes.map(gene => {
    if (Math.random() < mutationRate) {
      // Randomly mutate room or time slot
      if (Math.random() < 0.5) {
        return { ...gene, roomId: randomChoice(rooms).id };
      } else {
        // Use availability-aware time slot selection
        const newTimeSlot = gene.instructorId
          ? selectTimeSlotForInstructor(gene.instructorId, timeSlots, availabilityMap)
          : randomChoice(timeSlots);
        return { ...gene, timeSlotId: newTimeSlot.id };
      }
    }
    return { ...gene };
  });

  return { genes: mutatedGenes, fitness: 0 };
}

// Main genetic algorithm function
export function runGeneticAlgorithm(
  courses: Course[],
  sections: Section[],
  rooms: Room[],
  timeSlots: TimeSlot[],
  config: GAConfig = defaultGAConfig,
  onProgress?: (generation: number, bestFitness: number) => void,
  instructorAvailability?: InstructorAvailability[]
): { chromosome: Chromosome; conflicts: ConflictInfo[]; generations: number } {
  
  if (courses.length === 0 || sections.length === 0 || rooms.length === 0 || timeSlots.length === 0) {
    return {
      chromosome: { genes: [], fitness: 0 },
      conflicts: [],
      generations: 0,
    };
  }

  // Build availability map for quick lookup
  const availabilityMap = new Map<string, InstructorAvailability>();
  if (instructorAvailability) {
    for (const avail of instructorAvailability) {
      const key = `${avail.instructorId}_${avail.timeSlotId}`;
      availabilityMap.set(key, avail);
    }
  }

  // Initialize population
  let population: Chromosome[] = Array.from({ length: config.populationSize }, () =>
    generateRandomChromosome(courses, sections, rooms, timeSlots, availabilityMap)
  );

  // Calculate initial fitness
  population = population.map(chromosome => ({
    ...chromosome,
    fitness: calculateFitness(chromosome, timeSlots, availabilityMap),
  }));

  let bestChromosome = population.reduce((best, current) =>
    current.fitness > best.fitness ? current : best
  );

  let generationsRun = 0;

  // Main evolution loop
  for (let generation = 0; generation < config.generations; generation++) {
    generationsRun = generation + 1;

    // Check for perfect solution (no conflicts)
    const bestConflicts = countConflicts(bestChromosome);
    if (bestConflicts.length === 0 && bestChromosome.fitness > 900) {
      break;
    }

    // Sort by fitness (descending)
    population.sort((a, b) => b.fitness - a.fitness);

    // Create new population
    const newPopulation: Chromosome[] = [];

    // Elitism: keep best chromosomes
    for (let i = 0; i < config.elitismCount; i++) {
      newPopulation.push({ ...population[i] });
    }

    // Generate rest of population through selection, crossover, and mutation
    while (newPopulation.length < config.populationSize) {
      // Selection
      const parent1 = tournamentSelection(population, config.tournamentSize);
      const parent2 = tournamentSelection(population, config.tournamentSize);

      let child1: Chromosome;
      let child2: Chromosome;

      // Crossover
      if (Math.random() < config.crossoverRate) {
        [child1, child2] = crossover(parent1, parent2);
      } else {
        child1 = { genes: [...parent1.genes], fitness: 0 };
        child2 = { genes: [...parent2.genes], fitness: 0 };
      }

      // Mutation
      child1 = mutate(child1, config.mutationRate, rooms, timeSlots, availabilityMap);
      child2 = mutate(child2, config.mutationRate, rooms, timeSlots, availabilityMap);

      // Calculate fitness
      child1.fitness = calculateFitness(child1, timeSlots, availabilityMap);
      child2.fitness = calculateFitness(child2, timeSlots, availabilityMap);

      newPopulation.push(child1);
      if (newPopulation.length < config.populationSize) {
        newPopulation.push(child2);
      }
    }

    population = newPopulation;

    // Update best chromosome
    const currentBest = population.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );

    if (currentBest.fitness > bestChromosome.fitness) {
      bestChromosome = currentBest;
    }

    // Report progress every 50 generations
    if (onProgress && generation % 50 === 0) {
      onProgress(generation, bestChromosome.fitness);
    }
  }

  const finalConflicts = countConflicts(bestChromosome);

  return {
    chromosome: bestChromosome,
    conflicts: finalConflicts,
    generations: generationsRun,
  };
}

export { countConflicts };
