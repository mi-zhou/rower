require 'data_mapper' # requires all the gems listed above

# set all String properties to have a default length of 255
DataMapper::Property::String.length(255)
# set all properties to be required by default
DataMapper::Property.required(true)

# NEW: GO term tables
class GoGeneSpeciesXref
  include DataMapper::Resource
  
  property :id,         Serial
  
  belongs_to :species, :key => true
  belongs_to :go, :key => true
  belongs_to :gene, :key => true
end

class Go
  include DataMapper::Resource
  property :id,         Serial
  property :go_id,      String, :unique => true
  property :term,       String
  
  has n, :go_gene_specie_xrefs
  has n, :genes, :through => :go_gene_specie_xrefs
  has n, :species, :through => :go_gene_specie_xrefs
end

class Gene
  include DataMapper::Resource
  property :id,         Serial
  property :name,      String, :unique => true
  
  has n, :go_gene_specie_xrefs
  has n, :gos, :through => :go_gene_specie_xrefs
  has n, :species, :through => :go_gene_specie_xrefs
end

class Species
  include DataMapper::Resource
  property :id,         Serial
  property :name,      String, :unique => true
  
  has n, :experiments, :required => false
  has n, :go_gene_specie_xrefs
  has n, :gos, :through => :go_gene_specie_xrefs
  has n, :genes, :through => :go_gene_specie_xrefs
end

class Experimentgroup
  include DataMapper::Resource
  
  has n, :experiments
  
  property :id,         Serial
  property :name,       String
end

class Experiment
  include DataMapper::Resource

  has n, :groups
  has n, :featuresets
  has n, :data
  
  belongs_to :species
  belongs_to :experimentgroup, :required => false 
  
  property :id,         Serial
  property :name,       String
  property :metadata,   Text
end

class Group
  include DataMapper::Resource

  belongs_to :experiment

  has n, :samples

  property :id,         Serial
  property :name,       String
end

class Sample
  include DataMapper::Resource

  belongs_to :group
  
  has n, :data

  property :id,   Serial
  property :name, String
end

class Featureset
  include DataMapper::Resource

  belongs_to :experiment

  has n, :features

  property :id,   Serial
  property :name, String
end

class Feature
  include DataMapper::Resource

  belongs_to :featureset
  
  has n, :data

  property :id,   Serial
  property :name, String
end

class Datum
  include DataMapper::Resource
    
  belongs_to :sample,     :key => true
  belongs_to :experiment, :key => true
  belongs_to :feature,    :key => true

  property :value, Float
end

DataMapper.finalize
