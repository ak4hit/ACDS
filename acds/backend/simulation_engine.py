import random

# (next_ttp_id, probability_weight)
TTP_GRAPH = {
    'T1110': [('T1550', 0.5), ('T1078', 0.3), ('T1136', 0.2)],
    'T1071': [('T1041', 0.6), ('T1105', 0.4)],
    'T1041': [('T1567', 0.5), ('T1048', 0.5)],
    'T1078': [('T1053', 0.5), ('T1547', 0.5)],
    'T1068': [('T1055', 0.7), ('T1134', 0.3)],
    'T1021': [('T1076', 0.5), ('T1028', 0.5)],
    'T1550': [('T1068', 0.6), ('T1021', 0.4)],
}

TTP_META = {
    'T1110': ('Brute Force',                         'Credential Access'),
    'T1550': ('Use Alternate Auth Material',          'Lateral Movement'),
    'T1078': ('Valid Accounts',                       'Defense Evasion'),
    'T1136': ('Create Account',                       'Persistence'),
    'T1071': ('Application Layer Protocol',           'Command and Control'),
    'T1041': ('Exfiltration Over C2 Channel',         'Exfiltration'),
    'T1105': ('Ingress Tool Transfer',                'Command and Control'),
    'T1567': ('Exfiltration Over Web Service',        'Exfiltration'),
    'T1048': ('Exfil Over Alternative Protocol',      'Exfiltration'),
    'T1068': ('Exploitation for Privilege Escalation','Privilege Escalation'),
    'T1021': ('Remote Services',                      'Lateral Movement'),
    'T1053': ('Scheduled Task/Job',                   'Execution'),
    'T1547': ('Boot or Logon Autostart Execution',    'Persistence'),
    'T1055': ('Process Injection',                    'Defense Evasion'),
    'T1134': ('Access Token Manipulation',            'Defense Evasion'),
    'T1076': ('Remote Desktop Protocol',              'Lateral Movement'),
    'T1028': ('Windows Remote Management',            'Lateral Movement'),
}

def simulate_attack_path(ttp_id: str, hops: int = 3) -> list[dict]:
    path = []
    current = ttp_id
    visited = set()
    for _ in range(hops):
        if current in visited:
            break
        visited.add(current)
        name, tactic = TTP_META.get(current, (current, 'Unknown'))
        path.append({'id': current, 'name': name, 'tactic': tactic})
        children = TTP_GRAPH.get(current)
        if not children:
            break
        ids, weights = zip(*children)
        current = random.choices(list(ids), weights=list(weights), k=1)[0]
    return path
