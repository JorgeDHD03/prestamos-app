"""
Loan Calculator — French Amortization System (cuota fija)

Formula: cuota = P × r / (1 - (1 + r)^-n)
Where:
  P = principal
  r = interest rate per period (as decimal, e.g., 5% → 0.05)
  n = total number of periods
"""

from typing import List, Dict


def calculate_periodic_payment(principal: float, rate_percent: float, periods: int, interest_type: str = "FIXED") -> float:
    """Calculate the fixed periodic payment."""
    r = rate_percent / 100.0
    if r == 0:
        return round(principal / periods, 2)
        
    if interest_type == "FLAT":
        total_interest = principal * r * periods
        return round((principal + total_interest) / periods, 2)
        
    # French Amortization (FIXED)
    payment = principal * r / (1 - (1 + r) ** (-periods))
    return round(payment, 2)


def generate_amortization_table(principal: float, rate_percent: float, periods: int, interest_type: str = "FIXED") -> List[Dict]:
    """
    Generate a full amortization table based on the interest methodology.
    """
    r = rate_percent / 100.0
    periodic_payment = calculate_periodic_payment(principal, rate_percent, periods, interest_type)
    
    if interest_type == "FLAT":
        periodic_interest = round(principal * r, 2)
        periodic_principal = round(periodic_payment - periodic_interest, 2)
        
        balance = principal
        table = []
        for i in range(1, periods + 1):
            if i == periods:
                periodic_principal = balance
                periodic_payment = round(periodic_principal + periodic_interest, 2)
                balance = 0.0
            else:
                balance = round(balance - periodic_principal, 2)

            table.append({
                "period": i,
                "payment": periodic_payment,
                "principal_portion": periodic_principal,
                "interest_portion": periodic_interest,
                "balance": max(balance, 0.0),
            })
        return table

    # Default: French Amortization
    balance = principal
    table = []

    for i in range(1, periods + 1):
        interest = round(balance * r, 2)
        principal_portion = round(periodic_payment - interest, 2)

        # Last period adjustment to avoid rounding drift
        if i == periods:
            principal_portion = round(balance, 2)
            payment = round(principal_portion + interest, 2)
            balance = 0.0
        else:
            payment = periodic_payment
            balance = round(balance - principal_portion, 2)

        table.append({
            "period": i,
            "payment": payment,
            "principal_portion": principal_portion,
            "interest_portion": interest,
            "balance": max(balance, 0.0),
        })

    return table


def calculate_total_amount(principal: float, rate_percent: float, periods: int, interest_type: str = "FIXED") -> float:
    """Calculate the total amount to be paid (principal + all interest)."""
    table = generate_amortization_table(principal, rate_percent, periods, interest_type)
    return round(sum(row["payment"] for row in table), 2)


def calculate_interest_for_balance(balance: float, rate_percent: float, original_principal: float = None, interest_type: str = "FIXED") -> float:
    """Calculate interest due on a given balance for one period."""
    r = rate_percent / 100.0
    if interest_type == "FLAT":
        # In FLAT rate, the periodic interest is strictly tied to the original principal
        return round((original_principal or balance) * r, 2)
    return round(balance * r, 2)


def calculate_penalty(overdue_balance: float, penalty_rate_percent: float) -> float:
    """Calculate penalty on overdue balance."""
    r = penalty_rate_percent / 100.0
    return round(overdue_balance * r, 2)
