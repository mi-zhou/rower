#Run with id of experiment to delete

require "#{File.expand_path(File.dirname(__FILE__))}/db_schema.rb"
require 'json'

DataMapper::Logger.new(STDERR, :debug)

#Connect to postgresql db
db_info = JSON.parse(File.read("./db_info.json"))
puts "connecting to db...\n"
DataMapper.setup(:default, "postgres://#{db_info["username"]}:#{db_info["password"]}@#{db_info["host"]}/#{db_info["db"]}")
puts "db connected\n"

e = ARGV[0].to_i

#Delete all data
x=1
while(Datum.all(:experiment => {:id => e}, :limit => 10).size > 0) do
  puts "Deleted #{10000*x}"
  x += 1
  Datum.all(:experiment => {:id => e}, :limit => 10000).destroy
end

#Delete all features
Feature.all(:featureset => {:experiment => {:id => e}}).destroy
Featureset.all(:experiment => {:id => e}).destroy

#Delete all samples
Sample.all(:group => {:experiment => {:id => e}}).destroy
Group.all(:experiment => {:id => e}).destroy

#Delete experiment
Experiment.get(e).destroy
