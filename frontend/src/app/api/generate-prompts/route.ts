import { NextRequest, NextResponse } from 'next/server';

type PromptType = 'diagnostic' | 'methodology' | 'implementation' | 'optimization' | 'collaboration';

interface Tone {
  tone: string;
  instruction: string;
}

interface Perspective {
  [key: string]: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { industry, industryType } = await request.json();
    
    if (!industry) {
      return NextResponse.json(
        { error: 'Industry must be provided' },
        { status: 400 }
      );
    }

    // Industry-based prompt generation
    const context = {
      industry,
      industryType: industryType || 'general',
      considerations: [
        `Industry-specific regulations and compliance requirements for ${industryType || industry}`,
        `Common challenges faced by ${industryType || industry} businesses`,
        `Best practices in the ${industryType || industry} sector`,
        `Emerging trends in ${industryType || industry}`,
        `Customer needs and pain points in ${industryType || industry}`
      ]
    };
    
    const mainSubject = industryType ? `${industry} (${industryType})` : industry;

    // Generate diverse and distinct industry-focused queries
    const generateTavilyQuery = (industry: string, promptType: PromptType, industryType: string): string => {
      // Different perspectives for each prompt type with more variations
      const perspectives: Perspective = {
        diagnostic: [
          `Analyze the key challenges and requirements for: ${industry}. Consider technical constraints, potential roadblocks, and success metrics.`,
          `What are the critical success factors and potential risks in: ${industry}?`,
          `What would an expert identify as the most challenging aspects of: ${industry}?`,
          `Break down the industry '${industry}' from a technical viewpoint. What are the key considerations and potential pitfalls?`,
          `What initial assessments should be made when analyzing: ${industry}?`,
          `How would an expert evaluate the market landscape of: ${industry}?`
        ],
        methodology: [
          `Outline a comprehensive, step-by-step methodology for analyzing: ${industry}. Include key phases and decision points.`,
          `What systematic approach would be used to understand: ${industry}? Break it down into clear, actionable stages.`,
          `Design a structured framework for researching: ${industry}. Include tools and techniques.`,
          `Create a detailed action plan for evaluating: ${industry}. Include milestones and success criteria.`,
          `What workflow would maximize efficiency for researching: ${industry}?`,
          `Propose a strategic approach for analyzing: ${industry}`
        ],
        implementation: [
          `Provide detailed steps for implementing solutions in: ${industry}. Include specific examples and best practices.`,
          `How would a professional implement strategies in: ${industry}? Be specific about tools, frameworks, and approaches.`,
          `Create a comprehensive guide for working with: ${industry}. Include relevant examples and case studies.`,
          `What are the key technical considerations for implementing solutions in: ${industry}?`,
          `Outline the workflow for executing projects in: ${industry}`,
          `What are the critical implementation details to consider for: ${industry}?`
        ],
        optimization: [
          `How can businesses optimize their operations in: ${industry}? Include specific techniques and metrics.`,
          `What are the key optimization opportunities and best practices in: ${industry}?`,
          `Propose comprehensive performance improvements for businesses in: ${industry}. Include benchmarks.`,
          `What strategies would an expert use to enhance operations in: ${industry}?`,
          `How can businesses refine and improve their approach to: ${industry}?`,
          `What optimization techniques would be most effective in: ${industry}?`
        ],
        collaboration: [
          `How should teams effectively collaborate when working on projects in: ${industry}? Define roles and communication strategies.`,
          `What are the key collaboration points for teams working in: ${industry}?`,
          `Outline a comprehensive team workflow and communication plan for projects in: ${industry}`,
          `How can teams ensure effective knowledge sharing and coordination in: ${industry}?`,
          `What stakeholder management strategies should be employed in: ${industry}?`,
          `How can teams facilitate better alignment when working on: ${industry}?`
        ]
      };

      // Get a random perspective for variation
      const perspectiveOptions = perspectives[promptType] || [];
      const randomPerspective = perspectiveOptions[Math.floor(Math.random() * perspectiveOptions.length)] || 
                              `Provide insights about: ${industry}`;

      // Different output formats for variety with specific instructions
      const formats = [
        'Provide a comprehensive response organized into clear, labeled sections with detailed explanations and practical examples.',
        'Use a structured bullet-point format with clear hierarchy (main points as headers, sub-points indented) for maximum readability.',
        'Present the information in a step-by-step guide format, with numbered steps and visual separation between major sections.',
        'Create a detailed analysis with subsections for key areas, including relevant examples where appropriate.',
        'Structure the response with an executive summary followed by in-depth details and implementation considerations.',
        'Use a Q&A format that anticipates and answers potential follow-up questions about the topic.',
        'Present the information as a decision tree or flow chart with detailed explanations for each branch or node.'
      ];
      const randomFormat = formats[Math.floor(Math.random() * formats.length)];

      // Different tones and styles for variety
      const tones: Tone[] = [
        { 
          tone: 'professional and authoritative', 
          instruction: 'Use precise technical language and industry-standard terminology while maintaining clarity.'
        },
        { 
          tone: 'conversational and engaging', 
          instruction: 'Write in a friendly, approachable tone that encourages interaction and understanding.'
        },
        { 
          tone: 'concise and direct', 
          instruction: 'Be brief and to the point, focusing on key information without unnecessary elaboration.'
        },
        { 
          tone: 'educational and detailed', 
          instruction: 'Provide thorough explanations and background information to ensure complete understanding.'
        },
        { 
          tone: 'persuasive and compelling', 
          instruction: 'Use persuasive language and strong arguments to convince the reader of your points.'
        },
        { 
          tone: 'analytical and data-driven', 
          instruction: 'Focus on data, statistics, and logical analysis to support your points.'
        }
      ];

      const randomTone = tones[Math.floor(Math.random() * tones.length)];
      
      // Additional considerations for the prompt
      const additionalConsiderations = [
        'Focus on practical, actionable insights',
        'Use clear, concise language',
        'Support claims with evidence or examples when possible',
      ];

      // Create a detailed response prompt with industry context
      return `For the ${industryType} industry, please provide a comprehensive and detailed response.

${randomPerspective}

Guidelines:
- Focus specifically on ${industryType} industry context
- Provide thorough and detailed information
- Use clear, well-structured paragraphs
- Include relevant examples and explanations
- Cover all important aspects of the topic

Tone: ${randomTone.tone}
${randomTone.instruction}

Additional considerations:
- ${additionalConsiderations.join('\n- ')}
- Include specific ${industryType} industry terminology
- Address common challenges in the ${industryType} sector

Your response should be comprehensive and detailed, covering all relevant aspects of the ${industryType} industry.`;
    };

    // Industry types to generate prompts for
    const industryTypes = [
      'Healthcare', 'Finance', 'Education', 'Technology', 'Retail',
      'Manufacturing', 'Hospitality', 'Real Estate', 'Transportation', 'Energy',
      'Entertainment', 'Media', 'Telecommunications', 'Agriculture', 'Construction',
      'Pharmaceuticals', 'Aerospace', 'Automotive', 'Fashion', 'Food & Beverage',
      'Other'
    ];

    // Generate prompts for all industries if no specific industry is provided
    const promptTypes: PromptType[] = ['diagnostic', 'methodology', 'implementation', 'optimization', 'collaboration'];
    const prompts = [];
    let promptId = 1;
    
    // If specific industry is provided, use that, otherwise use all industry types
    const targetIndustries = industry || industryType ? [industry || industryType] : [
      'Healthcare', 'Finance', 'Education', 'Technology', 'Retail',
      'Manufacturing', 'Hospitality', 'Real Estate', 'Transportation', 'Energy',
      'Entertainment', 'Media', 'Telecommunications', 'Agriculture', 'Construction',
      'Pharmaceuticals', 'Aerospace', 'Automotive', 'Fashion', 'Food & Beverage'
    ];

    // Generate 3 prompts for each industry
    for (const targetIndustry of targetIndustries) {
      if (!targetIndustry) continue;
      
      // Get 3 random prompt types for this industry
      const shuffledTypes = [...promptTypes].sort(() => 0.5 - Math.random());
      const selectedTypes = shuffledTypes.slice(0, 3);
      
      for (const promptType of selectedTypes) {
        const promptContent = generateTavilyQuery(
          targetIndustry,
          promptType,
          targetIndustry
        );
        
        prompts.push({
          id: promptId++,
          type: promptType,
          industry: targetIndustry,
          content: promptContent
        });
      }
    }

    return NextResponse.json({ 
      mainSubject: 'Industry-Specific AI Prompts',
      context: 'A collection of 100+ AI prompts across various industries',
      prompts: prompts
    });

  } catch (error) {
    console.error('Error generating prompt:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate prompt',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
