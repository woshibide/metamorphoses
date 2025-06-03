import csv
import os
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

def read_csv_data(csv_file):
    """read participant data from csv file"""
    participants = []
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                participants.append(row)
    except FileNotFoundError:
        print(f"error: {csv_file} not found")
        return []
    return participants

def setup_output_directory():
    """create output directory structure"""
    output_dir = Path('prod')
    output_dir.mkdir(exist_ok=True)
    (output_dir / 'participants').mkdir(exist_ok=True)
    return output_dir

def generate_participant_pages(participants, env, output_dir):
    """generate individual participant pages in their own folders"""
    template = env.get_template('participant_template.html')
    
    for participant in participants:
        # create safe folder name from artist name
        artist_name = participant.get('Artist_name', 'unknown')
        safe_name = "".join(c for c in artist_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_').lower()
        
        # create participant folder
        participant_dir = output_dir / 'participants' / safe_name
        participant_dir.mkdir(exist_ok=True)
        
        html_content = template.render(participant=participant)
        
        output_file = participant_dir / 'index.html'
        with open(output_file, 'w', encoding='utf-8') as file:
            file.write(html_content)
        
        print(f"generated: {output_file}")

def generate_home_page(participants, env, output_dir):
    """generate main home page with all participants"""
    template = env.get_template('index_template.html')
    html_content = template.render(participants=participants)
    
    output_file = output_dir / 'index.html'
    with open(output_file, 'w', encoding='utf-8') as file:
        file.write(html_content)
    
    print(f"generated: {output_file}")

def main():
    # setup jinja2 environment
    env = Environment(loader=FileSystemLoader('templates'))
    
    # read csv data
    participants = read_csv_data('info.csv')
    if not participants:
        print("no participant data found. exiting.")
        return
    
    # setup output directory
    output_dir = setup_output_directory()
    
    # generate pages
    generate_participant_pages(participants, env, output_dir)
    generate_home_page(participants, env, output_dir)
    
    print(f"\nsite generation complete! {len(participants)} participants processed.")
    print(f"open {output_dir}/index.html in your browser to view the site.")

if __name__ == "__main__":
    main()
