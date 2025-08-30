import { NextRequest, NextResponse } from 'next/server';

// Generate mock company profile for development/testing
function generateMockProfile(companyName: string, websiteUrl: string) {
  // Extract domain from website URL to prioritize URL-based data
  const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  
  // Domain-specific mock data with more comprehensive services and products
  const mockData = {
    'microsoft.com': {
      description: "Microsoft Corporation is an American multinational technology corporation that produces computer software, consumer electronics, personal computers, and related services. Microsoft is known for Windows operating systems, Microsoft Office suite, and Azure cloud computing services.",
      services: ["Cloud Computing (Azure)", "Software Development", "Enterprise Solutions", "AI and Machine Learning", "Cybersecurity Services", "Digital Transformation", "Data Analytics", "Business Intelligence"],
      products: ["Windows OS", "Microsoft Office", "Azure Cloud Platform", "Xbox Gaming", "Surface Devices", "Microsoft Teams", "Power BI", "Visual Studio"]
    },
    'neuralarc.ai': {
      description: "NeuralArc is an AI-powered technology company that specializes in artificial intelligence solutions, machine learning platforms, and intelligent automation systems. The company focuses on delivering cutting-edge AI technologies for businesses and enterprises.",
      services: ["AI Development", "Machine Learning Solutions", "Intelligent Automation", "Data Analytics", "AI Consulting", "Neural Network Design", "AI Model Training", "Predictive Analytics"],
      products: ["Helium AI", "Drift AI", "Micro SaaS Tools", "AI-Powered Business Intelligence", "Enterprise AI Solutions", "CRM Enhancement System"]
    },
    'apple.com': {
      description: "Apple Inc. is an American multinational technology company that specializes in consumer electronics, software, and online services. Apple is known for innovative products like iPhone, iPad, Mac computers, and services like the App Store.",
      services: ["Device Manufacturing", "Software Development", "Digital Services", "Cloud Storage (iCloud)", "Technical Support", "App Store Services", "Payment Processing", "Content Distribution"],
      products: ["iPhone", "iPad", "Mac Computers", "Apple Watch", "AirPods", "Apple TV", "HomePod", "Apple Pay"]
    },
    'google.com': {
      description: "Google LLC is an American multinational technology company that specializes in Internet-related services and products, including online advertising technologies, a search engine, cloud computing, software, and hardware.",
      services: ["Search Engine", "Online Advertising", "Cloud Computing (GCP)", "AI and Machine Learning", "Mobile OS Development", "Web Analytics", "Digital Marketing", "Enterprise Solutions"],
      products: ["Google Search", "Android OS", "Google Cloud Platform", "YouTube", "Google Workspace", "Chrome Browser", "Google Maps", "Gmail"]
    },
    'tesla.com': {
      description: "Tesla, Inc. is an American electric vehicle and clean energy company. Tesla designs and manufactures electric cars, battery energy storage systems, solar panels and solar roof tiles, and related products and services.",
      services: ["Electric Vehicle Manufacturing", "Energy Storage Solutions", "Solar Energy Systems", "Autonomous Driving Technology", "Charging Infrastructure", "Vehicle Maintenance", "Energy Consulting", "Software Updates"],
      products: ["Model S", "Model 3", "Model X", "Model Y", "Powerwall", "Solar Roof", "Supercharger", "Cybertruck"]
    },
    'netflix.com': {
      description: "Netflix is an American subscription streaming service and production company that offers a library of films and television series through distribution deals as well as its own productions.",
      services: ["Video Streaming", "Content Production", "Content Distribution", "Personalization Technology", "Global Content Delivery", "Original Programming", "Multi-language Support", "Cross-platform Streaming"],
      products: ["Netflix Platform", "Netflix Originals", "Mobile Apps", "Smart TV Apps", "Recommendation Engine", "Download Feature", "Netflix Games", "Interactive Content"]
    },
    'amazon.com': {
      description: "Amazon.com, Inc. is an American multinational technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence.",
      services: ["E-commerce Platform", "Cloud Computing (AWS)", "Digital Streaming", "Logistics and Delivery", "AI and Machine Learning", "Web Services", "Digital Advertising", "Voice Technology"],
      products: ["Amazon Marketplace", "AWS Cloud Services", "Prime Video", "Alexa", "Echo Devices", "Kindle", "Fire TV", "Amazon Pay"]
    }
  };

  // Get domain-specific data or use generic
  const specificData = mockData[domain as keyof typeof mockData];
  
  if (specificData) {
    return {
      companyName,
      websiteUrl,
      description: specificData.description,
      services: specificData.services,
      products: specificData.products,
      lastUpdated: new Date().toISOString(),
      dataSource: 'mock'
    };
  }

  // Generate dynamic mock data based on website URL domain
  const urlDomain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const isEcommerce = urlDomain.includes('shop') || urlDomain.includes('store') || urlDomain.includes('buy');
  const isTech = urlDomain.includes('tech') || urlDomain.includes('dev') || urlDomain.includes('ai') || urlDomain.includes('software');
  const isFinance = urlDomain.includes('bank') || urlDomain.includes('finance') || urlDomain.includes('pay') || urlDomain.includes('invest');
  const isHealth = urlDomain.includes('health') || urlDomain.includes('medical') || urlDomain.includes('care') || urlDomain.includes('pharma');
  
  let services, products;
  
  if (isEcommerce) {
    services = ["E-commerce Platform", "Online Retail", "Payment Processing", "Order Fulfillment", "Customer Service", "Digital Marketing", "Inventory Management", "Shipping Solutions"];
    products = ["Online Store", "Mobile Shopping App", "Payment Gateway", "Inventory System", "Customer Portal", "Analytics Dashboard", "Marketing Tools", "Logistics Platform"];
  } else if (isTech) {
    services = ["Software Development", "Cloud Solutions", "AI/ML Services", "Data Analytics", "System Integration", "Technical Consulting", "DevOps Services", "Cybersecurity"];
    products = ["Software Platform", "Mobile Applications", "Cloud Infrastructure", "API Services", "Analytics Tools", "Security Solutions", "Development Tools", "Integration Platform"];
  } else if (isFinance) {
    services = ["Financial Services", "Investment Management", "Payment Processing", "Risk Assessment", "Compliance Solutions", "Financial Planning", "Digital Banking", "Wealth Management"];
    products = ["Banking Platform", "Investment Tools", "Payment Solutions", "Risk Management System", "Mobile Banking App", "Trading Platform", "Financial Dashboard", "Compliance Software"];
  } else if (isHealth) {
    services = ["Healthcare Solutions", "Medical Technology", "Patient Care", "Health Analytics", "Telemedicine", "Medical Research", "Clinical Services", "Health Consulting"];
    products = ["Healthcare Platform", "Medical Devices", "Patient Management System", "Health Monitoring Tools", "Telemedicine App", "Clinical Software", "Health Analytics", "Medical Records System"];
  } else {
    services = ["Professional Services", "Business Solutions", "Technology Consulting", "Customer Support", "Strategic Planning", "Digital Transformation", "Process Optimization", "Training Services"];
    products = ["Business Platform", "Management Software", "Customer Portal", "Analytics Dashboard", "Mobile Application", "Integration Tools", "Reporting System", "Workflow Solutions"];
  }

  return {
    companyName,
    websiteUrl,
    description: `${companyName} is a ${isTech ? 'technology' : isFinance ? 'financial services' : isHealth ? 'healthcare' : isEcommerce ? 'e-commerce' : 'professional services'} company that provides innovative solutions and services to businesses and consumers. The company focuses on delivering high-quality products and maintaining strong customer relationships through excellent service and support.`,
    services: services.slice(0, 6),
    products: products.slice(0, 6),
    lastUpdated: new Date().toISOString(),
    dataSource: 'mock'
  };
}

export async function POST(request: NextRequest) {
  try {
    const { companyName, websiteUrl } = await request.json();

    if (!companyName || !websiteUrl) {
      return NextResponse.json(
        { error: 'Company name and website URL are required' },
        { status: 400 }
      );
    }

    // For development, use a mock response if no API key
    const hasTavilyKey = !!process.env.TAVILY_API_KEY;
    console.log('Environment check:', {
      hasTavilyKey,
      keyLength: process.env.TAVILY_API_KEY?.length || 0
    });

    if (!hasTavilyKey) {
      console.warn('TAVILY_API_KEY not found, using mock data for development');
      
      // Return mock company data based on website URL (prioritized over company name)
      const mockProfile = generateMockProfile(companyName, websiteUrl);
      return NextResponse.json({ companyProfile: mockProfile });
    }

    // Call Tavily API to get company information with multiple targeted queries
    // Prioritize website URL over company name for accurate results
    const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    const queries = [
      `site:${domain} about company overview what they do services products`,
      `site:${domain} company profile business description`,
      `"${domain}" company overview services products business model`,
      `${domain} about us company information services offerings`,
      `site:${domain} company mission vision services products industry`
    ];

    let tavlyData = null;
    let bestQuery = '';

    // Try multiple queries to get the best results
    for (const query of queries) {
      try {
        console.log(`Attempting Tavily query: ${query}`);
        
        const requestBody = {
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 8,
        };

        console.log('Tavily request:', JSON.stringify(requestBody, null, 2));

        const tavlyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`Tavily response status: ${tavlyResponse.status}`);

        if (tavlyResponse.ok) {
          const data = await tavlyResponse.json();
          console.log(`Tavily response for "${query}":`, {
            hasAnswer: !!data.answer,
            answerLength: data.answer?.length || 0,
            resultsCount: data.results?.length || 0,
            answer: data.answer?.substring(0, 200) + '...'
          });
          
          if (data.answer && data.answer.length > 50) {
            tavlyData = data;
            bestQuery = query;
            console.log(`SUCCESS: Found good answer with query: ${query}`);
            break;
          } else if (!tavlyData && data.results?.length > 0) {
            tavlyData = data;
            bestQuery = query;
            console.log(`PARTIAL: Found results with query: ${query}`);
          }
        } else {
          const errorText = await tavlyResponse.text();
          console.error(`Tavily API error ${tavlyResponse.status}:`, errorText);
        }
      } catch (error) {
        console.error(`Query failed: ${query}`, error.message);
        continue;
      }
    }

    if (!tavlyData) {
      throw new Error('All Tavily API queries failed');
    }

    console.log(`Using results from query: ${bestQuery}`);

    // Process the response to extract company information
    let companyDescription = '';
    let services = [];
    let products = [];

    if (tavlyData.answer) {
      companyDescription = tavlyData.answer;
      console.log(`Initial description length: ${companyDescription.length}`);
      
      // If the description is too short, enhance it with additional context
      if (companyDescription.split('\n').length < 4 || companyDescription.length < 400) {
        const additionalContext = tavlyData.results && tavlyData.results.length > 0 
          ? tavlyData.results.slice(0, 3).map(result => result.content).join(' ').substring(0, 500)
          : '';
        
        if (additionalContext) {
          companyDescription = `${companyDescription}\n\n${additionalContext}`.trim();
          console.log(`Enhanced description length: ${companyDescription.length}`);
        }
      }
    } else if (tavlyData.results && tavlyData.results.length > 0) {
      // If no answer, create description from search results
      companyDescription = tavlyData.results
        .slice(0, 3)
        .map(result => result.content)
        .join(' ')
        .substring(0, 800);
      console.log(`Description from results length: ${companyDescription.length}`);
    }

    // Extract services and products from search results
    if (tavlyData.results && tavlyData.results.length > 0) {
      const combinedContent = tavlyData.results
        .map(result => result.content)
        .join(' ')
        .toLowerCase();

      // Enhanced keyword extraction for services and products
      const servicePatterns = [
        /(?:services?|solutions?)\s*(?:include|are|offered|:)?\s*([^.]{15,80})/gi,
        /(?:offers?|provides?|delivers?)\s+([^.]{15,80})/gi,
        /specializes?\s+in\s+([^.]{15,80})/gi,
        /(?:consulting|support|development|design|marketing|analytics|management|training|implementation)\s*(?:services?|solutions?)?\s*([^.]{10,60})/gi,
        /(?:we|they|company)\s+(?:offer|provide|deliver|specialize)\s+([^.]{15,80})/gi,
        /(?:expertise|experience)\s+in\s+([^.]{15,80})/gi
      ];

      const productPatterns = [
        /(?:products?|tools?|platforms?|software|applications?|systems?)\s*(?:include|are|offered|:)?\s*([^.]{15,80})/gi,
        /(?:built|developed|created|launched)\s+([^.]{15,80}(?:platform|tool|software|system|app|product))/gi,
        /(?:suite|dashboard|api|system|platform|application)\s+([^.]{10,60})/gi,
        /(?:flagship|main|core|primary)\s+(?:product|platform|solution)\s+([^.]{15,80})/gi,
        /(?:portfolio|lineup)\s+(?:includes?|features?)\s+([^.]{15,80})/gi,
        /([A-Z][a-zA-Z]+\s+AI|[A-Z][a-zA-Z]+\s+Platform|[A-Z][a-zA-Z]+\s+System|[A-Z][a-zA-Z]+\s+Tools?)/gi,
        /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*)\s*(?:AI|Platform|System|Tool|Suite|Dashboard|Engine|Framework|SDK|API)\b/gi,
        /\b(Helium|Drift|Micro\s+SaaS|Intelligence|Enterprise)\s*(?:AI|Platform|System|Tools?|Suite|Solutions?)\b/gi
      ];

      // Extract services using patterns
      servicePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(combinedContent)) !== null && services.length < 10) {
          const service = match[1].trim().replace(/[,;].*$/, ''); // Remove trailing clauses
          if (service.length > 10 && service.length < 100 && 
              !services.some(s => s.toLowerCase().includes(service.toLowerCase().substring(0, 15)))) {
            services.push(service.charAt(0).toUpperCase() + service.slice(1));
          }
        }
      });

      // Extract products using patterns
      productPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(combinedContent)) !== null && products.length < 10) {
          const product = match[1].trim().replace(/[,;].*$/, ''); // Remove trailing clauses
          if (product.length > 10 && product.length < 100 && 
              !products.some(p => p.toLowerCase().includes(product.toLowerCase().substring(0, 15)))) {
            products.push(product.charAt(0).toUpperCase() + product.slice(1));
          }
        }
      });

      // Additional extraction from titles and structured content
      tavlyData.results.forEach(result => {
        if (result.title && services.length < 10) {
          const titleLower = result.title.toLowerCase();
          if (titleLower.includes('services') || titleLower.includes('solutions')) {
            const titleService = result.title.replace(/[^\w\s]/g, '').trim();
            if (titleService.length > 10 && titleService.length < 80 &&
                !services.some(s => s.toLowerCase().includes(titleService.toLowerCase().substring(0, 15)))) {
              services.push(titleService);
            }
          }
        }
        
        if (result.title && products.length < 10) {
          const titleLower = result.title.toLowerCase();
          if (titleLower.includes('product') || titleLower.includes('platform') || titleLower.includes('software')) {
            const titleProduct = result.title.replace(/[^\w\s]/g, '').trim();
            if (titleProduct.length > 10 && titleProduct.length < 80 &&
                !products.some(p => p.toLowerCase().includes(titleProduct.toLowerCase().substring(0, 15)))) {
              products.push(titleProduct);
            }
          }
        }
      });

      console.log(`Extracted ${services.length} services and ${products.length} products`);
    }

    // Don't use generic fallbacks - keep empty if no real data found
    // This will help identify when Tavily API isn't working properly

    // Always use Tavily data if available, even if short
    const hasRealContent = companyDescription && companyDescription.length > 50;

    console.log(`Has real content: ${hasRealContent}, Description length: ${companyDescription?.length || 0}`);
    console.log(`Company description preview: ${companyDescription?.substring(0, 100)}...`);

    const companyProfile = {
      companyName,
      websiteUrl,
      description: hasRealContent ? companyDescription : 
        `Unable to fetch detailed information for ${companyName}. Please verify the company name and website URL are correct, or try again later.`,
      services: services.length > 0 ? services.slice(0, 5) : ['Information not available'],
      products: products.length > 0 ? products.slice(0, 5) : ['Information not available'],
      lastUpdated: new Date().toISOString(),
      dataSource: hasRealContent ? 'tavily' : 'unavailable'
    };

    return NextResponse.json({ companyProfile });

  } catch (error) {
    console.error('Error fetching company profile:', error);
    
    // Parse request body to get company details for error response
    let requestData = { companyName: 'Unknown', websiteUrl: 'Unknown' };
    try {
      const body = await request.clone().json();
      requestData = body;
    } catch (parseError) {
      console.error('Failed to parse request body in error handler:', parseError);
    }
    
    // Return error details instead of fallback
    return NextResponse.json(
      { 
        error: 'Failed to fetch company profile',
        details: error.message,
        companyName: requestData.companyName,
        websiteUrl: requestData.websiteUrl
      },
      { status: 500 }
    );
  }
}
