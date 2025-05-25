import { NextResponse } from 'next/server';
import { addMonths, format, startOfMonth, endOfMonth, addDays } from 'date-fns';

interface ApiData {
  project: string;
  parent_name: string;
  stage: string;
  subjects: string[] | string;
  day: string;
  start_time: string;
  end_time: string;
  fee: number;
}

interface ApiResponse {
  data: ApiData[];
  meta: {
    count: number;
    page: number;
    pageSize: number;
    totalPage: number;
  };
}

interface FeeCalculation {
  Project: string;
  parent_name: string;
  Stage: string;
  Subjects: string;
  Day: string;
  Count: number;
  Fee: number;
  Total: number;
}

async function fetchAllData(apiUrl: string, apiToken: string): Promise<ApiData[]> {
  let allData: ApiData[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await fetch(`${apiUrl}?filter={}&page=${currentPage}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from external API');
    }

    const result = await response.json() as ApiResponse;
    allData = [...allData, ...result.data];
    totalPages = result.meta.totalPage;
    currentPage++;
  } while (currentPage <= totalPages);

  return allData;
}

export async function GET() {
  try {
    const apiUrl = process.env.API_URL || 'https://tuition-work.onrender.com/api/data:list';
    const apiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRlbXAiOnRydWUsInNpZ25JblRpbWUiOjE3NDgwNjczNzczOTksImlhdCI6MTc0ODE1NDA1OCwiZXhwIjoxNzQ4MjQwNDU4LCJqdGkiOiJjOTEwZjliMC01ZmFjLTQ1MGYtOWFlOS04NjdjNjk3ZDU0YjIifQ.VwtBrYRFUEByL0BehvHDViW8d2ygVkOOEX50r2m9p8o';

    if (!apiToken) {
      throw new Error('API token is not configured');
    }

    const allData = await fetchAllData(apiUrl, apiToken);
    
    if (!allData || !Array.isArray(allData)) {
      return NextResponse.json([], { status: 200 });
    }
    
    const today = new Date();
    const nextMonth = addMonths(today, 1);
    const startDate = startOfMonth(nextMonth);
    const endDate = endOfMonth(nextMonth);
    
    const feeCalculations: FeeCalculation[] = [];
    
    for (const row of allData) {
      const { project, parent_name, stage, day, fee, subjects } = row;
      
      let classCount = 0;
      let currentDate = startDate;
      
      while (currentDate <= endDate) {
        const dayName = format(currentDate, 'EEEE');
        if (dayName === day) {
          classCount++;
        }
        currentDate = addDays(currentDate, 1);
      }
      
      if (classCount > 0) {
        feeCalculations.push({
          Project: project,
          parent_name: parent_name,
          Stage: stage,
          Subjects: Array.isArray(subjects) ? subjects.join(' & ') : String(subjects || ''),
          Day: day,
          Count: classCount,
          Fee: fee || 0,
          Total: classCount * (fee || 0)
        });
      }
    }
    
    // 按Project和Stage排序
    feeCalculations.sort((a, b) => {
      const projectComparison = a.Project.localeCompare(b.Project);
      if (projectComparison !== 0) {
        return projectComparison;
      }
      return a.Stage.localeCompare(b.Stage);
    });
    
    return NextResponse.json(feeCalculations);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json([], { status: 500 });
  }
} 