// --- Helper Functions ---
function getDateInput(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`getDateInput: Element with ID '${id}' not found.`);
        return null;
    }
    const dateStr = element.value;
    if (!dateStr) {
        // console.log(`getDateInput: No date string for ID '${id}'.`);
        return null;
    }
    // console.log(`getDateInput: ID '${id}', Value '${dateStr}'`);
    return new Date(dateStr + "T00:00:00Z");
}

function getFloatInput(id, defaultValue = NaN) { // 기본값을 NaN으로 하여 명시적 확인
    const element = document.getElementById(id);
    if (!element) {
        // console.warn(`getFloatInput: Element with ID '${id}' not found. Returning ${defaultValue}.`);
        return defaultValue;
    }
    const valStr = element.value;
    if (valStr.trim() === "") { // 빈 문자열이면 defaultValue (NaN) 반환
        // console.log(`getFloatInput: Empty string for ID '${id}'. Returning ${defaultValue}.`);
        return defaultValue;
    }
    const val = parseFloat(valStr);
    // console.log(`getFloatInput: ID '${id}', Value '${valStr}', Parsed '${val}'`);
    return isNaN(val) ? defaultValue : val; // 여전히 NaN일 수 있음
}

function formatCurrency(amount) {
    if (amount === null || typeof amount === 'undefined' || isNaN(amount)) return "계산 불가";
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(amount));
}

function displayDetails(htmlContent) {
    const el = document.getElementById('calculationDetails');
    if (el) el.innerHTML = htmlContent;
    else console.error("displayDetails: 'calculationDetails' element not found.");
}

function addMessage(messageHtml) {
    const el = document.getElementById('messages');
    if (el) el.innerHTML += messageHtml;
    else console.error("addMessage: 'messages' element not found.");
}

function clearMessages() {
    const el = document.getElementById('messages');
    if (el) el.innerHTML = "";
    else console.error("clearMessages: 'messages' element not found.");
}

function clearCalculationDetails() {
    const el = document.getElementById('calculationDetails');
    if (el) el.innerHTML = "";
    else console.error("clearCalculationDetails: 'calculationDetails' element not found.");
}

function calculatePeriodDurations(serviceStartDate, serviceEndDate) {
    if (!serviceStartDate || !serviceEndDate || serviceStartDate.getTime() > serviceEndDate.getTime()) {
        return { yearsP1: 0, yearsP2: 0, yearsP3: 0, totalServiceYears: 0, error: true, message: "오류: 퇴직일이 입사일보다 빠르거나 날짜가 유효하지 않습니다." };
    }
    const p1EndDate = new Date("2009-12-31T00:00:00Z");
    const p2StartDate = new Date("2010-01-01T00:00:00Z");
    const p2EndDate = new Date("2015-12-31T00:00:00Z");
    const p3StartDate = new Date("2016-01-01T00:00:00Z");
    const daysInYear = 365.25;
    const totalServiceMs = serviceEndDate.getTime() - serviceStartDate.getTime();
    const totalServiceDays = (totalServiceMs / (1000 * 60 * 60 * 24)) + 1;
    const totalServiceYears = totalServiceDays / daysInYear;

    let daysP1 = 0, daysP2 = 0, daysP3 = 0;
    const p1ActualStart = serviceStartDate;
    const p1ActualEnd = new Date(Math.min(serviceEndDate.getTime(), p1EndDate.getTime()));
    if (p1ActualStart.getTime() <= p1ActualEnd.getTime()) {
        daysP1 = ((p1ActualEnd.getTime() - p1ActualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    const p2ActualStart = new Date(Math.max(serviceStartDate.getTime(), p2StartDate.getTime()));
    const p2ActualEnd = new Date(Math.min(serviceEndDate.getTime(), p2EndDate.getTime()));
     if (p2ActualStart.getTime() <= p2ActualEnd.getTime()) {
        daysP2 = ((p2ActualEnd.getTime() - p2ActualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    const p3ActualStart = new Date(Math.max(serviceStartDate.getTime(), p3StartDate.getTime()));
    const p3ActualEnd = serviceEndDate;
    if (p3ActualStart.getTime() <= p3ActualEnd.getTime()) {
        daysP3 = ((p3ActualEnd.getTime() - p3ActualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    daysP1 = Math.max(0, daysP1); daysP2 = Math.max(0, daysP2); daysP3 = Math.max(0, daysP3);
    const yearsP1 = daysP1 / daysInYear;
    const yearsP2 = daysP2 / daysInYear;
    const yearsP3 = daysP3 / daysInYear;
    return { yearsP1, yearsP2, yearsP3, totalServiceYears, error: false, message: "" };
}

// --- Benefit Calculation Functions ---
function calculateRetirementPension(
    avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3,
    transitionRate, annualPaymentRateP3,
    yearsP1, yearsP2, yearsP3, totalServiceYears
) {
    let pensionP1 = 0;
    if (yearsP1 > 0) {
        if (totalServiceYears < 20) {
            pensionP1 = avgMonthlySalaryPv * yearsP1 * (2.5 / 100);
        } else {
            const yearsOver20 = Math.max(0, totalServiceYears - 20);
            pensionP1 = avgMonthlySalaryPv * (50 / 100) + avgMonthlySalaryPv * yearsOver20 * (2 / 100);
        }
    }
    let pensionP2 = 0;
    if (yearsP2 > 0) {
        pensionP2 = avgStdMonthlyIncomeP2 * transitionRate * yearsP2 * (1.9 / 100);
    }
    let pensionP3 = 0;
    if (yearsP3 > 0) {
        pensionP3 = avgStdMonthlyIncomeP3 * transitionRate * yearsP3 * annualPaymentRateP3;
    }
    const totalPension = pensionP1 + pensionP2 + pensionP3;
    
    let detailsHtml = `<h3>퇴직연금 상세</h3>
                       <p>1기간 기여분: ${formatCurrency(pensionP1)}</p>
                       <p>2기간 기여분: ${formatCurrency(pensionP2)}</p>
                       <p>3기간 기여분: ${formatCurrency(pensionP3)}</p>`;
    displayDetails(detailsHtml);
    return totalPension;
}

function calculateEarlyRetirementPension(
    avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3,
    transitionRate, annualPaymentRateP3, reductionFactor,
    yearsP1, yearsP2, yearsP3, totalServiceYears
) {
    const fullPension = calculateRetirementPension(
        avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3,
        transitionRate, annualPaymentRateP3,
        yearsP1, yearsP2, yearsP3, totalServiceYears
    );
    const earlyPension = fullPension * reductionFactor;
    let detailsHtml = document.getElementById('calculationDetails').innerHTML; 
    detailsHtml += `<h3>조기퇴직연금 추가 정보</h3>
                    <p>정상 퇴직연금액 (기준): ${formatCurrency(fullPension)}</p>
                    <p>조기퇴직연금 지급률: ${(reductionFactor * 100).toFixed(1)}%</p>`;
    displayDetails(detailsHtml);
    if (reductionFactor < 0.75 || reductionFactor > 0.95) {
        addMessage("<p>경고: 조기퇴직연금 지급률은 보통 0.75 ~ 0.95 사이입니다.</p>");
    }
    return earlyPension;
}

function calculatePensionDeductionLumpsum(
    avgMonthlySalaryPv, stdMonthlyIncome,
    totalDeductedServiceYears, priorPeriodDedYears, laterPeriodDedYears
) {
    if (totalDeductedServiceYears <= 0) {
        addMessage("<p>공제총재직연수가 0 이하이므로 계산할 수 없습니다.</p>");
        return null;
    }
    if (Math.abs((priorPeriodDedYears + laterPeriodDedYears) - totalDeductedServiceYears) > 0.01) {
        addMessage("<p>경고: 공제총재직연수와 종전/이후기간의 합이 일치하지 않습니다.</p>");
    }
    let amountP1 = 0;
    if (priorPeriodDedYears > 0) {
        const baseP1 = (avgMonthlySalaryPv * totalDeductedServiceYears * (150 / 100)) +
                       (avgMonthlySalaryPv * totalDeductedServiceYears * totalDeductedServiceYears / 100);
        amountP1 = baseP1 * (priorPeriodDedYears / totalDeductedServiceYears);
    }
    let amountP2P3 = 0;
    if (laterPeriodDedYears > 0) {
        const baseP2P3 = (stdMonthlyIncome * totalDeductedServiceYears * (975 / 1000)) +
                         (stdMonthlyIncome * totalDeductedServiceYears * totalDeductedServiceYears * (65 / 10000));
        amountP2P3 = baseP2P3 * (laterPeriodDedYears / totalDeductedServiceYears);
    }
    const totalLumpsum = amountP1 + amountP2P3;
    let detailsHtml = `<h3>퇴직연금공제일시금 상세</h3>
                       <p>종전기간 기여분: ${formatCurrency(amountP1)}</p>
                       <p>이후기간 기여분: ${formatCurrency(amountP2P3)}</p>`;
    displayDetails(detailsHtml);
    return totalLumpsum;
}

function calculatePensionLumpsum(
    avgMonthlySalaryPv, stdMonthlyIncome,
    yearsP1, yearsP2PlusP3, totalServiceYears
) {
    if (totalServiceYears <= 0) {
        addMessage("<p>총 재직연수가 0 이하이므로 계산할 수 없습니다.</p>");
        return null;
    }
    if (totalServiceYears <= 5) {
        addMessage("<p>참고: 퇴직연금일시금은 통상 총 재직기간 5년 초과 시 적용됩니다.</p>");
    }
    const serviceYearsOver5 = Math.max(0, totalServiceYears - 5);
    let amountP1 = 0;
    if (yearsP1 > 0) {
        const baseP1 = (avgMonthlySalaryPv * totalServiceYears * (150 / 100)) +
                       (avgMonthlySalaryPv * serviceYearsOver5 * totalServiceYears / 100);
        amountP1 = baseP1 * (yearsP1 / totalServiceYears);
    }
    let amountP2P3 = 0;
    if (yearsP2PlusP3 > 0) {
        const baseP2P3 = (stdMonthlyIncome * totalServiceYears * (975 / 1000)) +
                         (stdMonthlyIncome * serviceYearsOver5 * totalServiceYears * (65 / 10000));
        amountP2P3 = baseP2P3 * (yearsP2PlusP3 / totalServiceYears);
    }
    const totalLumpsum = amountP1 + amountP2P3;
    let detailsHtml = `<h3>퇴직연금일시금 상세</h3>
                       <p>종전기간 기여분: ${formatCurrency(amountP1)}</p>
                       <p>이후기간 기여분: ${formatCurrency(amountP2P3)}</p>
                       <p>(계산 시 사용된 총 재직연수: ${totalServiceYears.toFixed(2)}년, 5년초과 재직연수: ${serviceYearsOver5.toFixed(2)}년)</p>`;
    if (totalServiceYears > 0) {
        detailsHtml += `<p>(종전기간 비중: ${(yearsP1/totalServiceYears*100).toFixed(2)}% , 이후기간 비중: ${(yearsP2PlusP3/totalServiceYears*100).toFixed(2)}%)</p>`;
    }
    displayDetails(detailsHtml);
    return totalLumpsum;
}

function calculateRetirementLumpsum(
    avgMonthlySalaryPv, stdMonthlyIncome,
    yearsP1, yearsP2, yearsP3, totalServiceYears
) {
    if (totalServiceYears <= 0) {
        addMessage("<p>총 재직연수가 0 이하이므로 계산할 수 없습니다.</p>");
        return null;
    }
    let detailsHtml = "";
    let totalLumpsum = 0;
    let amountP1 = 0, amountP2 = 0, amountP3Specific = 0;

    if (totalServiceYears < 5) {
        detailsHtml += `<h3>퇴직일시금 (&lt; 5년) 상세</h3>`;
        if (yearsP1 > 0 && totalServiceYears > 0) { // totalServiceYears > 0 조건 추가 (0으로 나누기 방지)
            amountP1 = (avgMonthlySalaryPv * totalServiceYears * (120 / 100)) * (yearsP1 / totalServiceYears);
            detailsHtml += `<p>1기간(종전) 기여분: ${formatCurrency(amountP1)}</p>`;
        }
        if (yearsP2 > 0 && totalServiceYears > 0) {
            amountP2 = (stdMonthlyIncome * totalServiceYears * (78 / 100)) * (yearsP2 / totalServiceYears);
            detailsHtml += `<p>2기간 기여분: ${formatCurrency(amountP2)}</p>`;
        }
        if (yearsP3 > 0 && totalServiceYears > 0) {
            amountP3Specific = (stdMonthlyIncome * totalServiceYears * (975 / 1000)) * (yearsP3 / totalServiceYears);
            detailsHtml += `<p>3기간 기여분: ${formatCurrency(amountP3Specific)}</p>`;
        }
        totalLumpsum = amountP1 + amountP2 + amountP3Specific;
    } else if (totalServiceYears >= 5 && totalServiceYears < 10) {
        const serviceYearsOver5 = Math.max(0, totalServiceYears - 5);
        detailsHtml += `<h3>퇴직일시금 (5년 ~ 10년 미만) 상세</h3>`;
        if (yearsP1 > 0 && totalServiceYears > 0) {
            const baseP1 = (avgMonthlySalaryPv * totalServiceYears * (150 / 100)) +
                           (avgMonthlySalaryPv * serviceYearsOver5 * totalServiceYears / 100);
            amountP1 = baseP1 * (yearsP1 / totalServiceYears);
            detailsHtml += `<p>종전기간 기여분: ${formatCurrency(amountP1)}</p>`;
        }
        const yearsP2PlusP3 = yearsP2 + yearsP3;
        let amountP2P3Combined = 0;
        if (yearsP2PlusP3 > 0 && totalServiceYears > 0) {
            const baseP2P3 = (stdMonthlyIncome * totalServiceYears * (975 / 1000)) +
                             (stdMonthlyIncome * serviceYearsOver5 * totalServiceYears * (65 / 10000));
            amountP2P3Combined = baseP2P3 * (yearsP2PlusP3 / totalServiceYears);
            detailsHtml += `<p>이후기간(2+3기간) 기여분: ${formatCurrency(amountP2P3Combined)}</p>`;
        }
        totalLumpsum = amountP1 + amountP2P3Combined;
    } else { 
        addMessage("<p>선택하신 '퇴직일시금' 계산식은 재직기간 10년 미만인 경우에 해당합니다. 다른 급여 유형을 선택해주세요.</p>");
        displayDetails(""); 
        return null;
    }
    displayDetails(detailsHtml);
    return totalLumpsum;
}

// --- Dynamic Input Fields ---
document.getElementById('benefitType').addEventListener('change', function() {
    console.log("Benefit type changed to: ", this.value); // 디버깅 로그
    const benefitType = this.value;
    const conditionalInputsDiv = document.getElementById('conditionalInputs');
    if (!conditionalInputsDiv) {
        console.error("'conditionalInputs' div not found!");
        return;
    }
    conditionalInputsDiv.innerHTML = ''; 

    let html = '';
    if (benefitType) {
        html = '<div class="conditional-input-set">';
        if (benefitType === 'retirementPension' || benefitType === 'earlyRetirementPension') {
            html += `<h3>퇴직연금/조기퇴직연금 공통 입력</h3>
                     <div class="input-group"><label for="avgMonthlySalaryPv">평균보수월액 현가액 (1기간용):</label><input type="number" id="avgMonthlySalaryPv" placeholder="숫자 입력"></div>
                     <div class="input-group"><label for="avgStdMonthlyIncomeP2">평균기준소득월액 (2기간용):</label><input type="number" id="avgStdMonthlyIncomeP2" placeholder="숫자 입력"></div>
                     <div class="input-group"><label for="avgStdMonthlyIncomeP3">평균기준소득월액 (3기간용):</label><input type="number" id="avgStdMonthlyIncomeP3" placeholder="숫자 입력"></div>
                     <div class="input-group"><label for="transitionRate">이행률 (예: 1.0):</label><input type="number" id="transitionRate" step="0.01" value="1.0" placeholder="1.0"></div>
                     <div class="input-group"><label for="annualPaymentRateP3">3기간 연금의 연간지급률 (예: 0.019):</label><input type="number" id="annualPaymentRateP3" step="0.001" placeholder="0.019"></div>`;
            if (benefitType === 'earlyRetirementPension') {
                html += `<div class="input-group"><label for="reductionFactor">조기퇴직연금 지급률 (0.75~0.95):</label><input type="number" id="reductionFactor" step="0.01" placeholder="0.75"></div>`;
            }
        } else if (benefitType === 'pensionDeductionLumpsum') {
            html += `<h3>퇴직연금공제일시금 입력</h3>
                     <div class="input-group"><label for="avgMonthlySalaryPv">보수월액 현가액 (종전):</label><input type="number" id="avgMonthlySalaryPv" placeholder="숫자 입력"></div>
                     <div class="input-group"><label for="stdMonthlyIncome">기준소득월액 (이후):</label><input type="number" id="stdMonthlyIncome" placeholder="숫자 입력"></div>
                     <div class="input-group"><label for="totalDeductedServiceYears">공제총재직연수:</label><input type="number" id="totalDeductedServiceYears" step="0.01" placeholder="숫자 입력"></div>
                     <div class="input-group"><label for="priorPeriodDedYears">공제총재직연수 중 종전기간 연수:</label><input type="number" id="priorPeriodDedYears" step="0.01" placeholder="숫자 입력"></div>`;
        } else if (benefitType === 'pensionLumpsum' || benefitType === 'retirementLumpsum') {
            const title = benefitType === 'pensionLumpsum' ? "퇴직연금일시금" : "퇴직일시금";
            html += `<h3>${title} 입력</h3>
                     <div class="input-group"><label for="avgMonthlySalaryPv">보수월액 현가액 (종전):</label><input type="number" id="avgMonthlySalaryPv" placeholder="숫자 입력"></div>
                     <div class="input-group"><label for="stdMonthlyIncome">기준소득월액 (이후):</label><input type="number" id="stdMonthlyIncome" placeholder="숫자 입력"></div>`;
        }
        html += '</div>';
    }
    conditionalInputsDiv.innerHTML = html;
});

// --- Main Calculation Trigger ---
// 이 함수는 HTML에서 <button onclick="calculateBenefit()">에 의해 호출됩니다.
function calculateBenefit() {
    console.log("calculateBenefit function called."); // 함수 호출 확인

    // 결과 영역 초기화
    const periodInfoEl = document.getElementById('periodInfo');
    const totalBenefitEl = document.getElementById('totalBenefit');
    if(periodInfoEl) periodInfoEl.innerHTML = '';
    clearCalculationDetails();
    if(totalBenefitEl) totalBenefitEl.innerHTML = '';
    clearMessages();

    const serviceStartDate = getDateInput('serviceStartDate');
    const serviceEndDate = getDateInput('serviceEndDate');
    const benefitType = document.getElementById('benefitType') ? document.getElementById('benefitType').value : "";

    console.log("Service Start Date:", serviceStartDate);
    console.log("Service End Date:", serviceEndDate);
    console.log("Benefit Type:", benefitType);


    if (!serviceStartDate || !serviceEndDate) {
        addMessage("<p>입사일과 퇴직일을 모두 입력해주세요.</p>"); 
        console.log("Dates not provided.");
        return;
    }
    if (!benefitType) {
        addMessage("<p>계산할 급여 유형을 선택해주세요.</p>"); 
        console.log("Benefit type not selected.");
        return;
    }

    const periodData = calculatePeriodDurations(serviceStartDate, serviceEndDate);
    if (periodData.error) {
        addMessage(`<p>${periodData.message}</p>`); 
        console.log("Error in period calculation:", periodData.message);
        return;
    }
    const { yearsP1, yearsP2, yearsP3, totalServiceYears } = periodData;
    
    if(periodInfoEl) {
        periodInfoEl.innerHTML = `
            <p>총 재직연수: ${totalServiceYears.toFixed(2)} 년</p>
            <p>  - 1기간 ('09.12.31 이전): ${yearsP1.toFixed(2)} 년</p>
            <p>  - 2기간 ('10.1.1~'15.12.31): ${yearsP2.toFixed(2)} 년</p>
            <p>  - 3기간 ('16.1.1 이후): ${yearsP3.toFixed(2)} 년</p>`;
    }


    if (totalServiceYears <=0 && !periodData.error) {
        addMessage("<p>재직 기간이 없어 계산할 수 없습니다.</p>"); 
        console.log("Total service years is zero.");
        return;
    }

    let totalCalculatedAmount = null;

    // 입력값 가져오기 전에 해당 필드가 존재하는지 확인하는 것이 좋지만, 
    // getFloatInput에서 ID가 없는 경우를 처리하므로 일단 진행.
    const avgMonthlySalaryPv = getFloatInput('avgMonthlySalaryPv');
    const stdMonthlyIncome = getFloatInput('stdMonthlyIncome'); 
    
    console.log("avgMonthlySalaryPv:", avgMonthlySalaryPv);
    console.log("stdMonthlyIncome:", stdMonthlyIncome);

    try {
        console.log("Trying to calculate for benefit type:", benefitType);
        if (benefitType === 'retirementPension') {
            const avgStdMonthlyIncomeP2 = getFloatInput('avgStdMonthlyIncomeP2');
            const avgStdMonthlyIncomeP3 = getFloatInput('avgStdMonthlyIncomeP3');
            const transitionRate = getFloatInput('transitionRate', 1.0);
            const annualPaymentRateP3 = getFloatInput('annualPaymentRateP3');
             console.log("Inputs for retirementPension:", avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3, transitionRate, annualPaymentRateP3);
            if ([avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3, transitionRate, annualPaymentRateP3].some(isNaN)) {
                addMessage("<p>퇴직연금 계산에 필요한 숫자 입력값을 확인해주세요.</p>");
            } else {
                totalCalculatedAmount = calculateRetirementPension(
                    avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3,
                    transitionRate, annualPaymentRateP3,
                    yearsP1, yearsP2, yearsP3, totalServiceYears
                );
            }
        } else if (benefitType === 'earlyRetirementPension') {
            const avgStdMonthlyIncomeP2 = getFloatInput('avgStdMonthlyIncomeP2');
            const avgStdMonthlyIncomeP3 = getFloatInput('avgStdMonthlyIncomeP3');
            const transitionRate = getFloatInput('transitionRate', 1.0);
            const annualPaymentRateP3 = getFloatInput('annualPaymentRateP3');
            const reductionFactor = getFloatInput('reductionFactor');
            console.log("Inputs for earlyRetirementPension:", avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3, transitionRate, annualPaymentRateP3, reductionFactor);
             if ([avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3, transitionRate, annualPaymentRateP3, reductionFactor].some(isNaN)) {
                addMessage("<p>조기퇴직연금 계산에 필요한 숫자 입력값을 확인해주세요.</p>");
            } else {
                totalCalculatedAmount = calculateEarlyRetirementPension(
                    avgMonthlySalaryPv, avgStdMonthlyIncomeP2, avgStdMonthlyIncomeP3,
                    transitionRate, annualPaymentRateP3, reductionFactor,
                    yearsP1, yearsP2, yearsP3, totalServiceYears
                );
            }
        } else if (benefitType === 'pensionDeductionLumpsum') {
            const totalDeductedServiceYears = getFloatInput('totalDeductedServiceYears');
            const priorPeriodDedYears = getFloatInput('priorPeriodDedYears');
             console.log("Inputs for pensionDeductionLumpsum:", avgMonthlySalaryPv, stdMonthlyIncome, totalDeductedServiceYears, priorPeriodDedYears);
            if ([avgMonthlySalaryPv, stdMonthlyIncome, totalDeductedServiceYears, priorPeriodDedYears].some(isNaN)) {
                 addMessage("<p>퇴직연금공제일시금 계산에 필요한 숫자 입력값을 확인해주세요.</p>");
            } else if (priorPeriodDedYears < 0 || priorPeriodDedYears > totalDeductedServiceYears) {
                addMessage("<p>오류: 공제 기간 입력값이 유효하지 않습니다 (종전기간 연수는 0 이상, 총 공제연수 이하).</p>");
            } else {
                const laterPeriodDedYears = totalDeductedServiceYears - priorPeriodDedYears;
                totalCalculatedAmount = calculatePensionDeductionLumpsum(
                    avgMonthlySalaryPv, stdMonthlyIncome,
                    totalDeductedServiceYears, priorPeriodDedYears, laterPeriodDedYears
                );
            }
        } else if (benefitType === 'pensionLumpsum') {
            console.log("Inputs for pensionLumpsum:", avgMonthlySalaryPv, stdMonthlyIncome);
            if ([avgMonthlySalaryPv, stdMonthlyIncome].some(isNaN)) {
                addMessage("<p>퇴직연금일시금 계산에 필요한 숫자 입력값을 확인해주세요.</p>");
            } else {
                const yearsP2PlusP3 = yearsP2 + yearsP3;
                totalCalculatedAmount = calculatePensionLumpsum(
                    avgMonthlySalaryPv, stdMonthlyIncome,
                    yearsP1, yearsP2PlusP3, totalServiceYears
                );
            }
        } else if (benefitType === 'retirementLumpsum') {
            console.log("Inputs for retirementLumpsum:", avgMonthlySalaryPv, stdMonthlyIncome);
             if ([avgMonthlySalaryPv, stdMonthlyIncome].some(isNaN)) {
                addMessage("<p>퇴직일시금 계산에 필요한 숫자 입력값을 확인해주세요.</p>");
            } else {
                totalCalculatedAmount = calculateRetirementLumpsum(
                    avgMonthlySalaryPv, stdMonthlyIncome,
                    yearsP1, yearsP2, yearsP3, totalServiceYears
                );
            }
        } else {
            addMessage("<p>알 수 없는 급여 유형입니다.</p>");
            console.log("Unknown benefit type:", benefitType);
        }

        console.log("Total Calculated Amount:", totalCalculatedAmount);

        if (totalCalculatedAmount !== null && typeof totalCalculatedAmount !== 'undefined') {
             if(totalBenefitEl) totalBenefitEl.innerHTML = `계산된 총 급여액: ${formatCurrency(totalCalculatedAmount)}`;
        } else {
            if (document.getElementById('messages').innerHTML.trim() === "") { 
                 addMessage("<p>급여액을 계산할 수 없었습니다. 입력값을 확인하거나 다른 유형을 선택해주세요.</p>");
            }
             if(totalBenefitEl) totalBenefitEl.innerHTML = '';
        }

    } catch (e) {
        addMessage(`<p>계산 중 예상치 못한 오류 발생: ${e.message}</p>`);
        console.error("Error during calculation:", e);
    }
    console.log("calculateBenefit function finished.");
}

// DOM 로드 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed.");
    const manualLink = document.getElementById('manualLink');
    if (manualLink && manualLink.href.includes("YOUR_CAFE_LINK_HERE")) {
        console.warn("index.html 파일의 'YOUR_CAFE_LINK_HERE'를 실제 카페 URL로 변경해주세요.");
    }

    const benefitTypeSelect = document.getElementById('benefitType');
    if(!benefitTypeSelect) {
        console.error("Benefit type select element not found!");
    }
});