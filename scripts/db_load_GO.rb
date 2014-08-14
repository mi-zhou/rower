#Run with two arguments: the location of the go data file, and 'species name'
require "#{File.expand_path(File.dirname(__FILE__))}/db_schema.rb"

DataMapper::Logger.new(STDERR, :debug)

#Connect to postgresql db
db_info = JSON.parse(File.read("./db_info.json"))
puts "connecting to db...\n"
DataMapper.setup(:default, "postgres://#{db_info["username"]}:#{db_info["password"]}@#{db_info["host"]}/#{db_info["db"]}")
puts "db connected\n"

species_name = ARGV[1]
puts "Loading GO data for ["+species_name+"]..."

# Add species if it is not added already
species = Species.first_or_create(:name => species_name)
species.save

go_data = File.read(ARGV[0]).split("\n")[1..-1].map{|l| l.strip().split("\t")}

go_data.each do |go|
  gene_name, go_id, go_term = go
  if go_id != "NA" and go_term != "NA"

    gene = Gene.first_or_create(:name => gene_name)
    gene.save
    go = Go.first_or_create({:go_id => go_id},{:term => go_term})
    go.save
    
    #Create association in xref table if one does not exist already
    xref = GoGeneSpeciesXref.first_or_create(:go => go, :gene => gene, :species => species)
    xref.save
    
  end
end
