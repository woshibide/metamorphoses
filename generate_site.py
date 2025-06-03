import csv
import os
import json
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

def generate_image_map(output_dir):
    """scan for images in participant folders and generate image-map.json"""
    image_map = {}
    participants_dir = output_dir / 'participants'
    
    if participants_dir.exists():
        for participant_folder in participants_dir.iterdir():
            if participant_folder.is_dir():
                folder_name = participant_folder.name
                images = []
                
                # scan for .webp files in the participant folder
                for image_file in participant_folder.glob('*.webp'):
                    # store relative path from the participants folder
                    relative_path = f"participants/{folder_name}/{image_file.name}"
                    images.append(relative_path)
                
                if images:
                    image_map[folder_name] = sorted(images)  # sort for consistency
    
    # write image map to json file
    image_map_file = output_dir / 'image-map.json'
    with open(image_map_file, 'w', encoding='utf-8') as file:
        json.dump(image_map, file, indent=2, ensure_ascii=False)
    
    print(f"generated: {image_map_file} with {len(image_map)} participants")
    return image_map

def generate_participant_pages(participants, env, output_dir, image_map):
    """generate individual participant pages in their own folders"""
    template = env.get_template('participant_template.html')
    
    print(f"debug: generating participant pages...")
    print(f"debug: available image map keys: {list(image_map.keys())}")
    
    for participant in participants:
        # create safe folder name from artist name
        artist_name = participant.get('Artist_name', 'unknown')
        safe_name = "".join(c for c in artist_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_').lower()
        
        print(f"debug: participant '{artist_name}' -> safe_name '{safe_name}'")
        
        # create participant folder
        participant_dir = output_dir / 'participants' / safe_name
        participant_dir.mkdir(exist_ok=True)
        
        # get images for this participant
        participant_images = image_map.get(safe_name, [])
        print(f"debug: found {len(participant_images)} images for '{safe_name}': {participant_images}")
        
        html_content = template.render(
            participant=participant, 
            images=participant_images
        )
        
        output_file = participant_dir / 'index.html'
        with open(output_file, 'w', encoding='utf-8') as file:
            file.write(html_content)
        
        print(f"generated: {output_file}")
        
    print("debug: participant page generation complete")

def generate_home_page(participants, env, output_dir, image_map):
    """generate main home page with all participants"""
    template = env.get_template('index_template.html')
    
    # add safe_name to each participant for template use
    participants_with_safe_names = []
    for participant in participants:
        artist_name = participant.get('Artist_name', 'unknown')
        safe_name = "".join(c for c in artist_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_').lower()
        
        participant_copy = participant.copy()
        participant_copy['safe_name'] = safe_name
        participants_with_safe_names.append(participant_copy)
    
    html_content = template.render(
        participants=participants_with_safe_names,
        image_map=image_map
    )
    
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
    
    # generate image map from existing photos
    image_map = generate_image_map(output_dir)
    
    # generate pages
    generate_participant_pages(participants, env, output_dir, image_map)
    generate_home_page(participants, env, output_dir, image_map)
    
    print(f"\nsite generation complete! {len(participants)} participants processed.")
    print(f"image map generated with {len(image_map)} participants having photos.")
    print(f"open {output_dir}/index.html in your browser to view the site.")

if __name__ == "__main__":
    main()
