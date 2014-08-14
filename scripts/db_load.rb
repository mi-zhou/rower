#Run with four arguments: the location of the experiment definition file, sample definition file, feature definition file
#And data matrix.

require 'yaml'
require "#{File.expand_path(File.dirname(__FILE__))}/db_schema.rb"

DataMapper::Logger.new(STDERR, :debug)

#Connect to postgresql db
db_info = JSON.parse(File.read("./db_info.json"))
puts "connecting to db...\n"
DataMapper.setup(:default, "postgres://#{db_info["username"]}:#{db_info["password"]}@#{db_info["host"]}/#{db_info["db"]}")
puts "db connected\n"

DataMapper::Model.raise_on_save_failure = true  # globally across all models

#Create experiment
puts "Loading experiments"
experiment_data = Hash[File.read(ARGV[0]).split("\n").map{|l| l.split("\t")}]
experiment = Experiment.create(:name => experiment_data["name"], :metadata => experiment_data.to_yaml)

#Create sample groups and samples
puts "Loading samples"
group_data = Hash[File.read(ARGV[1]).split("\n")[1..-1].map{|l| l.split("\t")}]
#First the groups (all unique values of the sample -> group Hash)
groups = group_data.values.uniq.map do |group|
  Group.create(:name => group, :experiment => experiment)
end
#Then the samples themselves (each key of the Hash)
samples = group_data.keys.map do |sample|
  group = Group.all(:experiment => experiment, :name => group_data[sample])
  raise "This sample maps to multiple groups in this experiment. This really shouldn't happen." if group.size > 1
  raise "This sample doesn't map to any group in this experiment. This really shouldn't happen." if group.size < 1
  Sample.create(:name => sample, :group => group[0])
end

#Create feature sets and features
puts "Loading features"
feature_data = Hash[File.read(ARGV[2]).split("\n")[1..-1].map{|l| l.split("\t")}]

#Remove any missing features with warning
feature_data.delete_if{|f,fs|
  STDERR.puts "Missing featureset name for '#{f}'" if (fs.nil? || fs.length == 0)
  fs.nil? || fs.length == 0
}

#First the sets (all unique values of the feature -> featureset Hash)
set_hash = {}
sets = feature_data.values.uniq.map do |set|
  set_hash[set] = Featureset.create(:name => set, :experiment => experiment)
end
#Then the features themselves (each key of the Hash)
feature_hash = {}
total_features = feature_data.size
i = 0
features = feature_data.keys.map do |feature|
  i += 1
  if (i % 100 == 0)
    print "Loaded #{sprintf("%.0f",(i.to_f/total_features)*100)}% of features\r"
  end
  feature_hash[feature] = Feature.create(:name => feature, :featureset => set_hash[feature_data[feature]])
end

#Load data - this could be large so one row at a time please
puts ""
puts "Loading data"
samples = []

total_lines = 0
File.foreach(ARGV[3]){|_| total_lines += 1}

File.foreach(ARGV[3]) do |line|
  line = line.chomp.split("\t")
  #First line is column header
  if $. == 1
    samples = line.map do |c| 
      sample = Sample.all({:name => c, :group => {:experiment => experiment}})
      raise "More than one sample was found in the db with name '#{c}'. This really shouldn't happen." if sample.size > 1
      raise "The sample '#{c}' was in the data file but not in the db. Something is wrong" if sample.size < 1
      sample[0]
    end
    next
  end
  
  if ($. % 100 == 0)
    print "Loaded #{sprintf("%2s",sprintf("%.0f",($..to_f/total_lines)*100))}% of data\r"
  end
  
  raise "There seems to be an incorrect number of columns (#{(line.length)-1} compared to #{samples.length} columns) at line #{$.}" if ((line.length) - 1) != samples.length
  
  #Find the feature with this name and that corresponds to *this* experiment
  feature = feature_hash[line[0]]
  next if feature.nil?
      
  line[1..-1].each_with_index do |datum_value,i|
    datum_value = datum_value.to_f
    sample = samples[i]
    
    Datum.create(:value => datum_value, :experiment => experiment, :sample => sample, :feature => feature)    
  end  
end

puts ""
